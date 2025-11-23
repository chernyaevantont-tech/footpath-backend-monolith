import { Injectable, NotFoundException, BadRequestException, Logger, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Raw } from 'typeorm';
import { Place } from './entities/place.entity';
import { Tag } from './entities/tag.entity';
import { PlaceModerationLog } from './entities/place-moderation-log.entity';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { PlaceFilterDto } from './dto/place-filter.dto';
import { PlaceStatus } from './entities/place.entity';
import { ModerationAction } from './entities/place-moderation-log.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { GenerateEmbeddingDto } from '../recommendations/dto/recommendation.dto';
import { RedisService } from '../common/redis.service';

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    @InjectRepository(Place)
    private placeRepository: Repository<Place>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(PlaceModerationLog)
    private moderationLogRepository: Repository<PlaceModerationLog>,
    @Inject(forwardRef(() => RecommendationsService))
    private recommendationsService: RecommendationsService,
    private redisService: RedisService,
  ) {}

  async createPlace(createPlaceDto: CreatePlaceDto) {
    this.logger.log('Creating new place');

    // Create coordinates point format for PostGIS
    const coordinates = `POINT(${createPlaceDto.coordinates.longitude} ${createPlaceDto.coordinates.latitude})`;

    // Create the place entity
    const place = new Place();
    place.name = createPlaceDto.name;
    place.description = createPlaceDto.description || null;
    place.coordinates = coordinates; // PostGIS Point format
    place.tagIds = createPlaceDto.tagIds || [];
    place.status = PlaceStatus.PENDING; // New places start as pending

    // Save the place first to get the ID
    const savedPlace = await this.placeRepository.save(place);

    // Log the submission
    await this.logModerationAction(
      savedPlace.id,
      null,
      ModerationAction.SUBMITTED,
      'Place submitted for review'
    );

    return savedPlace;
  }

  async findPlaces(filterDto: PlaceFilterDto) {
    this.logger.log('Finding places with filters');

    // Generate cache key from filter parameters
    const filterKey = JSON.stringify(filterDto);
    const cacheKey = `places:search:${filterKey}`;

    // Try to get from cache first
    const cachedResult = await this.redisService.getJson(cacheKey);
    if (cachedResult) {
      this.logger.log(`Cache hit for key: ${cacheKey}`);
      return cachedResult;
    }

    // Build query with filters
    const queryBuilder = this.placeRepository.createQueryBuilder('place');

    // Apply name filter
    if (filterDto.name) {
      queryBuilder.andWhere('place.name ILIKE :name', { name: `%${filterDto.name}%` });
    }

    // Apply status filter
    if (filterDto.status) {
      queryBuilder.andWhere('place.status = :status', { status: filterDto.status });
    }

    // Apply tag IDs filter
    if (filterDto.tagIds && filterDto.tagIds.length > 0) {
      // Since we're storing tagIds as a simple array, we check if any of the provided tag IDs are in the array
      queryBuilder.andWhere('place.tagIds && ARRAY[:...tagIds]', { tagIds: filterDto.tagIds });
    }

    // Apply location-based filter (geospatial)
    if (filterDto.location) {
      const { latitude, longitude, radius } = filterDto.location;

      queryBuilder
        .andWhere(
          'ST_DWithin(place.coordinates, ST_Point(:longitude, :latitude)::geography, :radius)',
          { longitude, latitude, radius }
        );
    }

    // Set pagination
    const page = filterDto.page || 1;
    const limit = Math.min(filterDto.limit || 10, 100); // Max 100 results per page
    const offset = (page - 1) * limit;

    queryBuilder
      .orderBy('place.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    // Execute query
    const [places, total] = await queryBuilder.getManyAndCount();

    const result = {
      data: places,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    // Cache the result for 5 minutes (300 seconds)
    await this.redisService.setJson(cacheKey, result, 300);
    this.logger.log(`Results cached for key: ${cacheKey}`);

    return result;
  }

  async getPlaceById(id: string) {
    const place = await this.placeRepository.findOne({ where: { id } });

    if (!place) {
      throw new NotFoundException(`Place with ID ${id} not found`);
    }

    return place;
  }

  async updatePlace(id: string, updatePlaceDto: UpdatePlaceDto) {
    this.logger.log(`Updating place with ID: ${id}`);

    const place = await this.placeRepository.findOne({ where: { id } });

    if (!place) {
      throw new NotFoundException(`Place with ID ${id} not found`);
    }

    // Check if place is already approved - updating approved places requires special handling
    if (place.status === PlaceStatus.APPROVED) {
      // For approved places, we might want to set status back to pending for re-moderation
      // For simplicity, we'll allow updates but not change the status
      this.logger.log(`Place ${id} was approved; updating content but keeping status`);
    }

    // Update fields if they're provided
    if (updatePlaceDto.name) {
      place.name = updatePlaceDto.name;
    }
    if (updatePlaceDto.description !== undefined) {
      place.description = updatePlaceDto.description;
    }
    if (updatePlaceDto.coordinates) {
      place.coordinates = `POINT(${updatePlaceDto.coordinates.longitude} ${updatePlaceDto.coordinates.latitude})`;
    }
    if (updatePlaceDto.tagIds) {
      place.tagIds = updatePlaceDto.tagIds;
    }

    const updatedPlace = await this.placeRepository.save(place);

    // Log the update
    await this.logModerationAction(
      updatedPlace.id,
      null,
      ModerationAction.UPDATED,
      'Place updated by user'
    );

    return updatedPlace;
  }

  async approvePlace(id: string, moderatorId: string, reason?: string) {
    this.logger.log(`Approving place with ID: ${id}, moderator: ${moderatorId}, reason: ${reason}`);

    const place = await this.placeRepository.findOne({ where: { id } });

    if (!place) {
      throw new NotFoundException(`Place with ID ${id} not found`);
    }

    place.status = PlaceStatus.APPROVED;
    place.moderatorId = moderatorId; // Track who approved it
    const updatedPlace = await this.placeRepository.save(place);

    // Log the approval
    await this.logModerationAction(
      place.id,
      moderatorId,
      ModerationAction.APPROVED,
      reason || 'Place approved'
    );

    // Generate embedding for the place after approval
    try {
      const generateEmbeddingDto: GenerateEmbeddingDto = {
        placeId: place.id,
        name: place.name,
        description: place.description || '',
        tags: place.tagIds || [],
      };

      await this.recommendationsService.generateEmbedding(generateEmbeddingDto);
      this.logger.log(`Generated embedding for approved place: ${place.id}`);
    } catch (error) {
      // If embedding generation fails, don't fail the approval process
      this.logger.error(`Failed to generate embedding for place ${place.id}: ${error.message}`);
    }

    return updatedPlace;
  }

  async rejectPlace(id: string, moderatorId: string, reason?: string) {
    this.logger.log(`Rejecting place with ID: ${id}, moderator: ${moderatorId}, reason: ${reason}`);

    const place = await this.placeRepository.findOne({ where: { id } });

    if (!place) {
      throw new NotFoundException(`Place with ID ${id} not found`);
    }

    place.status = PlaceStatus.REJECTED;
    place.moderatorId = moderatorId; // Track who rejected it
    await this.placeRepository.save(place);

    // Log the rejection
    await this.logModerationAction(
      place.id,
      moderatorId,
      ModerationAction.REJECTED,
      reason || 'Place rejected'
    );

    return place;
  }

  private async logModerationAction(
    placeId: string,
    moderatorId: string | null,
    action: ModerationAction,
    reason?: string,
  ) {
    const logEntry = new PlaceModerationLog();
    logEntry.placeId = placeId;
    logEntry.moderatorId = moderatorId;
    logEntry.action = action;
    logEntry.reason = reason || null;

    await this.moderationLogRepository.save(logEntry);

    this.logger.log(`Moderation action logged: ${action} for place ${placeId}`);
  }

  // Helper method to validate user access for moderation actions
  validateModeratorAccess(user: User): boolean {
    if (!user || !user.role) {
      return false;
    }
    return user.role === UserRole.MODERATOR || user.role === UserRole.ADMIN;
  }
}