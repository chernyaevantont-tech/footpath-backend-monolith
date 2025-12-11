import { Injectable, NotFoundException, BadRequestException, Logger, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Raw, getConnection } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Place } from './entities/place.entity';
import { Tag } from './entities/tag.entity';
import { PlaceModerationLog } from './entities/place-moderation-log.entity';
import { CreatePlaceDto } from './dto/place/create-place.dto';
import { UpdatePlaceDto } from './dto/place/update-place.dto';
import { PlaceFilterDto } from './dto/place/place-filter.dto';
import { PlaceStatus } from './entities/place.entity';
import { ModerationAction } from './entities/place-moderation-log.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { GenerateEmbeddingDto } from '../recommendations/dto/recommendation.dto';
import { PlaceResponseDto } from './dto/place/place-response.dto';
import { TagResponseDto } from './dto/tag/tag-response.dto';
import { CreateTagDto } from './dto/tag/create-tag.dto';
import { UpdateTagDto } from './dto/tag/update-tag.dto';

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
  ) {}

  // Helper method to convert Place entity to PlaceResponseDto
  private entityToDto(place: Place): PlaceResponseDto {
    const dto = new PlaceResponseDto();
    dto.id = place.id;
    dto.name = place.name;
    dto.description = place.description || null;
    dto.coordinates = place.coordinates;
    dto.status = place.status;
    dto.creatorId = place.creatorId || null;
    dto.moderatorId = place.moderatorId || null;
    dto.createdAt = place.createdAt;
    dto.updatedAt = place.updatedAt;
    dto.contentHash = place.contentHash || null;
    
    // Convert tags to DTOs
    dto.tags = place.tags?.map(tag => {
      const tagDto = new TagResponseDto();
      tagDto.id = tag.id;
      tagDto.name = tag.name;
      tagDto.createdAt = tag.createdAt;
      tagDto.updatedAt = tag.updatedAt;
      return tagDto;
    }) || [];
    
    return dto;
  }

  async createPlace(createPlaceDto: CreatePlaceDto, creatorId: string, userRole: string) {
    this.logger.log('Creating new place', { creatorId, userRole });

    try {
      // Create the place entity with WKT format
      const place = new Place();
      place.name = createPlaceDto.name;
      place.description = createPlaceDto.description || null;
      // Create WKT string format: 'POINT(longitude latitude)'
      const wktString = `POINT(${createPlaceDto.coordinates.longitude} ${createPlaceDto.coordinates.latitude})`;

      // Set status based on user role
      if (userRole === 'moderator' || userRole === 'admin') {
        place.status = PlaceStatus.APPROVED;
      } else {
        place.status = PlaceStatus.PENDING;
      }

      place.creatorId = creatorId;
      place.createdAt = new Date();
      place.updatedAt = new Date();
      place.coordinates = wktString;

      // Handle tags relationship
      let tagsToAssign = [];
      if (createPlaceDto.tagIds && createPlaceDto.tagIds.length > 0) {
        const tags = await this.tagRepository.findByIds(createPlaceDto.tagIds);
        if (tags.length !== createPlaceDto.tagIds.length) {
          throw new BadRequestException('One or more tag IDs are invalid');
        }
        tagsToAssign = tags;
      }

      // Assign tags to place for hash calculation
      place.tags = tagsToAssign;

      // Generate content hash before inserting
      place.generateHashOnInsert();

      // Use raw query with proper PostGIS functions for geometry
      const queryRunner = this.placeRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Insert the place using raw SQL with proper ST_GeomFromText function
        const result = await queryRunner.query(
          `INSERT INTO places (id, name, description, coordinates, status, creator_id, created_at, updated_at, content_hash)
           VALUES (DEFAULT, $1, $2, ST_SetSRID(ST_GeomFromText($3), 4326), $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            place.name,
            place.description,
            wktString,
            place.status,
            place.creatorId,
            place.createdAt,
            place.updatedAt,
            place.contentHash
          ]
        );

        const placeId = result[0].id;

        // If there are tags, insert them into the place_tags junction table
        if (tagsToAssign.length > 0) {
          for (const tag of tagsToAssign) {
            await queryRunner.query(
              `INSERT INTO place_tags (place_id, tag_id) VALUES ($1, $2)`,
              [placeId, tag.id]
            );
          }
        }

        await queryRunner.commitTransaction();

        // Return the complete place object
        const savedPlace = await this.placeRepository.findOne({
          where: { id: placeId },
          relations: ['tags']
        });

        // Log the submission
        await this.logModerationAction(
          savedPlace.id,
          null,
          ModerationAction.SUBMITTED,
          'Place submitted for review'
        );

        this.logger.log(`Successfully created place with ID: ${savedPlace.id}`);
        return this.entityToDto(savedPlace);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error(`Error creating place: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findPlaces(filterDto: PlaceFilterDto, user?: { id: string; role: string }) {
    this.logger.log('Finding places with filters', { filterDto, userId: user?.id, userRole: user?.role });

    try {
      // Build query with filters - including relation to tags
      const queryBuilder = this.placeRepository.createQueryBuilder('place')
        .leftJoinAndSelect('place.tags', 'tag');

      // Apply name filter
      if (filterDto.name) {
        queryBuilder.andWhere('place.name ILIKE :name', { name: `%${filterDto.name}%` });
      }

      // Apply status filter
      if (filterDto.status) {
        queryBuilder.andWhere('place.status = :status', { status: filterDto.status });
      }

      // Apply creator ID filter
      if (filterDto.creatorId) {
        queryBuilder.andWhere('place.creator_id = :creatorId', { creatorId: filterDto.creatorId });
      }

      // Role-based access control for statuses
      if (user && user.role !== 'moderator' && user.role !== 'admin') {
        // Regular users can only see their own pending/rejected places, but can see all approved places
        queryBuilder.andWhere(
          '(place.status = :approvedStatus OR place.creator_id = :userId)',
          {
            approvedStatus: PlaceStatus.APPROVED,
            userId: user.id
          }
        );
      }

      // Apply tag IDs filter
      if (filterDto.tagIds && filterDto.tagIds.length > 0) {
        queryBuilder.andWhere('tag.id IN (:...tagIds)', { tagIds: filterDto.tagIds });
      }

      // Apply location-based filter (geospatial)
      if (filterDto.location) {
        const { latitude, longitude, radius } = filterDto.location;
        this.logger.log(`Applying geospatial filter: lat=${latitude}, lng=${longitude}, radius=${radius}`);

        queryBuilder
          .andWhere(
            'ST_DWithin(place.coordinates, ST_Point(:longitude, :latitude)::geography, :radius)',
            { longitude, latitude, radius }
          );
      }

      // Apply pagination only if both page and limit are provided and limit > 0
      if (filterDto.page !== undefined && filterDto.limit !== undefined && filterDto.limit > 0) {
        const page = filterDto.page || 1;
        const limit = Math.min(filterDto.limit, 100); // Max 100 results per page
        const offset = (page - 1) * limit;

        queryBuilder
          .orderBy('place.createdAt', 'DESC')
          .limit(limit)
          .offset(offset);
      } else {
        // If no pagination parameters provided or limit is 0, order by creation date but don't limit results
        queryBuilder
          .orderBy('place.createdAt', 'DESC');
      }

      // Execute query
      let places;
      let total;

      if (filterDto.page !== undefined && filterDto.limit !== undefined && filterDto.limit > 0) {
        // Use pagination
        const page = filterDto.page || 1;
        const limit = Math.min(filterDto.limit, 100); // Max 100 results per page
        const offset = (page - 1) * limit;

        [places, total] = await queryBuilder
          .limit(limit)
          .offset(offset)
          .getManyAndCount();
      } else {
        // No pagination - get all results
        places = await queryBuilder.getMany();
        total = await queryBuilder.getCount(); // Get total count from DB without limit
      }

      this.logger.log(`Found ${places.length} places out of total ${total}`);

      // Convert to DTOs
      const placesDto = places.map(place => this.entityToDto(place));

      let result;
      if (filterDto.page !== undefined && filterDto.limit !== undefined && filterDto.limit > 0) {
        // Include pagination metadata when pagination is used
        const page = filterDto.page || 1;
        const limit = Math.min(filterDto.limit, 100);
        result = {
          data: placesDto,
          meta: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      } else {
        // Return just the data when no pagination or limit=0
        result = {
          data: placesDto,
          meta: null // No pagination metadata
        };
      }

      return result;
    } catch (error) {
      this.logger.error(`Error finding places: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPlaceById(id: string) {
    this.logger.log(`Getting place by ID: ${id}`);
    try {
      const place = await this.placeRepository.findOne({
        where: { id },
        relations: ['tags', 'creator', 'moderator', 'moderationLogs']
      });

      if (!place) {
        this.logger.warn(`Place with ID ${id} not found`);
        throw new NotFoundException(`Place with ID ${id} not found`);
      }

      this.logger.log(`Successfully retrieved place: ${id}`);
      return this.entityToDto(place);
    } catch (error) {
      this.logger.error(`Error getting place by ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updatePlace(id: string, updatePlaceDto: UpdatePlaceDto, updaterId: string, userRole: string) {
    this.logger.log(`Updating place with ID: ${id}, by user: ${updaterId}, role: ${userRole}`);

    const place = await this.placeRepository.findOne({
      where: { id },
      relations: ['tags']
    });

    if (!place) {
      throw new NotFoundException(`Place with ID ${id} not found`);
    }

    // Check permissions for updating place
    const hasPermission = await this.validateUpdateAccess(id, updaterId, userRole);
    if (!hasPermission) {
      throw new UnauthorizedException('You do not have permission to update this place');
    }

    // Auto-transition rejected places to pending when edited by user
    const shouldTransitionToPending = place.status === PlaceStatus.REJECTED && 
                                      place.creatorId === updaterId && 
                                      userRole === 'user';

    // Update fields if they're provided
    if (updatePlaceDto.name) {
      place.name = updatePlaceDto.name;
    }
    if (updatePlaceDto.description !== undefined) {
      place.description = updatePlaceDto.description;
    }

    // Handle tags relationship if provided
    if (updatePlaceDto.tagIds !== undefined) {
      if (updatePlaceDto.tagIds.length > 0) {
        const tags = await this.tagRepository.findByIds(updatePlaceDto.tagIds);
        if (tags.length !== updatePlaceDto.tagIds.length) {
          throw new BadRequestException('One or more tag IDs are invalid');
        }
        place.tags = tags;
      } else {
        // If empty array provided, clear all tags
        place.tags = [];
      }
    }

    // Update the place in database
    const updateData: any = {
      name: updatePlaceDto.name || place.name,
      description: updatePlaceDto.description !== undefined ? updatePlaceDto.description : place.description,
    };

    // Update coordinates if provided using raw query for proper geometry handling
    if (updatePlaceDto.coordinates) {
      const wktString = `POINT(${updatePlaceDto.coordinates.longitude} ${updatePlaceDto.coordinates.latitude})`;
      place.coordinates = wktString;

      const queryRunner = this.placeRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Generate content hash before updating
        place.generateHashOnUpdate();

        // Update the place with new coordinates using proper PostGIS functions
        if (shouldTransitionToPending) {
          await queryRunner.query(
            `UPDATE places SET name = $1, description = $2, coordinates = ST_SetSRID(ST_GeomFromText($3), 4326), updated_at = $4, content_hash = $5, status = $6 WHERE id = $7`,
            [updateData.name, updateData.description, wktString, new Date(), place.contentHash, PlaceStatus.PENDING, id]
          );
        } else {
          await queryRunner.query(
            `UPDATE places SET name = $1, description = $2, coordinates = ST_SetSRID(ST_GeomFromText($3), 4326), updated_at = $4, content_hash = $5 WHERE id = $6`,
            [updateData.name, updateData.description, wktString, new Date(), place.contentHash, id]
          );
        }

        // Handle tags separately if they were provided
        if (updatePlaceDto.tagIds !== undefined) {
          // First, remove all existing tag associations
          await queryRunner.query(
            `DELETE FROM place_tags WHERE place_id = $1`,
            [id]
          );

          // Then add new tag associations if any
          if (updatePlaceDto.tagIds.length > 0) {
            const tags = await this.tagRepository.findByIds(updatePlaceDto.tagIds);
            if (tags.length !== updatePlaceDto.tagIds.length) {
              throw new BadRequestException('One or more tag IDs are invalid');
            }

            for (const tag of tags) {
              await queryRunner.query(
                `INSERT INTO place_tags (place_id, tag_id) VALUES ($1, $2)`,
                [id, tag.id]
              );
            }
          }
        }

        await queryRunner.commitTransaction();

        // Return the updated place object
        const updatedPlace = await this.placeRepository.findOne({
          where: { id },
          relations: ['tags']
        });

        // Log the update
        await this.logModerationAction(
          updatedPlace.id,
          null,
          ModerationAction.UPDATED,
          'Place updated by user'
        );

        this.logger.log(`Successfully updated place with ID: ${updatedPlace.id}`);
        return this.entityToDto(updatedPlace);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      // If no coordinates to update, just update other fields
      const queryRunner = this.placeRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Generate content hash before updating
        place.generateHashOnUpdate();

        // Update the place without coordinates
        if (shouldTransitionToPending) {
          await queryRunner.query(
            `UPDATE places SET name = $1, description = $2, updated_at = $3, content_hash = $4, status = $5 WHERE id = $6`,
            [updateData.name, updateData.description, new Date(), place.contentHash, PlaceStatus.PENDING, id]
          );
        } else {
          await queryRunner.query(
            `UPDATE places SET name = $1, description = $2, updated_at = $3, content_hash = $4 WHERE id = $5`,
            [updateData.name, updateData.description, new Date(), place.contentHash, id]
          );
        }

        // Handle tags separately if they were provided
        if (updatePlaceDto.tagIds !== undefined) {
          // First, remove all existing tag associations
          await queryRunner.query(
            `DELETE FROM place_tags WHERE place_id = $1`,
            [id]
          );

          // Then add new tag associations if any
          if (updatePlaceDto.tagIds.length > 0) {
            const tags = await this.tagRepository.findByIds(updatePlaceDto.tagIds);
            if (tags.length !== updatePlaceDto.tagIds.length) {
              throw new BadRequestException('One or more tag IDs are invalid');
            }

            for (const tag of tags) {
              await queryRunner.query(
                `INSERT INTO place_tags (place_id, tag_id) VALUES ($1, $2)`,
                [id, tag.id]
              );
            }
          }
        }

        await queryRunner.commitTransaction();

        // Return the updated place object
        const updatedPlace = await this.placeRepository.findOne({
          where: { id },
          relations: ['tags']
        });

        // Log the update
        await this.logModerationAction(
          updatedPlace.id,
          null,
          ModerationAction.UPDATED,
          'Place updated by user'
        );

        return this.entityToDto(updatedPlace);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }
  }

  async approvePlace(id: string, moderatorId: string, reason?: string) {
    this.logger.log(`Approving place with ID: ${id}, moderator: ${moderatorId}, reason: ${reason}`);

    try {
      const place = await this.placeRepository.findOne({
        where: { id },
        relations: ['tags']
      });

      if (!place) {
        this.logger.warn(`Place with ID ${id} not found for approval`);
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
        // Extract tag names for embedding generation
        const tagNames = place.tags ? place.tags.map(tag => tag.name) : [];
        const generateEmbeddingDto: GenerateEmbeddingDto = {
          placeId: place.id,
          name: place.name,
          description: place.description || '',
          tags: tagNames,
        };

        await this.recommendationsService.generateEmbedding(generateEmbeddingDto);
        this.logger.log(`Generated embedding for approved place: ${place.id}`);
      } catch (error) {
        // If embedding generation fails, don't fail the approval process
        this.logger.error(`Failed to generate embedding for place ${place.id}: ${error.message}`);
      }

      this.logger.log(`Successfully approved place: ${place.id}`);
      return this.entityToDto(updatedPlace);
    } catch (error) {
      this.logger.error(`Error approving place ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async rejectPlace(id: string, moderatorId: string, reason?: string) {
    this.logger.log(`Rejecting place with ID: ${id}, moderator: ${moderatorId}, reason: ${reason}`);

    try {
      const place = await this.placeRepository.findOne({
        where: { id },
        relations: ['tags']
      });

      if (!place) {
        this.logger.warn(`Place with ID ${id} not found for rejection`);
        throw new NotFoundException(`Place with ID ${id} not found`);
      }

      place.status = PlaceStatus.REJECTED;
      place.moderatorId = moderatorId; // Track who rejected it
      const updatedPlace = await this.placeRepository.save(place);

      // Log the rejection
      await this.logModerationAction(
        place.id,
        moderatorId,
        ModerationAction.REJECTED,
        reason || 'Place rejected'
      );

      this.logger.log(`Successfully rejected place: ${place.id}`);
      return this.entityToDto(updatedPlace);
    } catch (error) {
      this.logger.error(`Error rejecting place ${id}: ${error.message}`, error.stack);
      throw error;
    }
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

  // Method to validate user access for updating places
  async validateUpdateAccess(placeId: string, userId: string, userRole: string): Promise<boolean> {
    const place = await this.placeRepository.findOne({ where: { id: placeId } });
    if (!place) {
      return false;
    }

    // Moderators and admins can update approved places
    if ((userRole === 'moderator' || userRole === 'admin') && place.status === PlaceStatus.APPROVED) {
      return true;
    }

    // Regular users can update their own pending or rejected places
    if (place.creatorId === userId && 
        (place.status === PlaceStatus.PENDING || place.status === PlaceStatus.REJECTED)) {
      return true;
    }

    return false;
  }

  // Method to validate user access for deleting places
  async validateDeleteAccess(placeId: string, userId: string, userRole: string): Promise<boolean> {
    const place = await this.placeRepository.findOne({ where: { id: placeId } });
    if (!place) {
      return false;
    }

    if (userRole === 'moderator' || userRole === 'admin') {
      // Moderators and admins can delete approved places of any user
      return place.status === PlaceStatus.APPROVED;
    } else {
      // Regular users can delete only their own pending or rejected places
      return place.creatorId === userId &&
             (place.status === PlaceStatus.PENDING || place.status === PlaceStatus.REJECTED);
    }
  }

  // Method to delete a place
  async deletePlace(id: string, userId: string, userRole: string) {
    this.logger.log(`Deleting place with ID: ${id}, by user: ${userId}, role: ${userRole}`);

    const place = await this.placeRepository.findOne({ where: { id } });

    if (!place) {
      throw new NotFoundException(`Place with ID ${id} not found`);
    }

    // Validate access based on role and place status
    const hasAccess = await this.validateDeleteAccess(id, userId, userRole);
    if (!hasAccess) {
      throw new UnauthorizedException('You do not have permission to delete this place');
    }

    // Perform the deletion
    await this.placeRepository.delete(id);

    this.logger.log(`Successfully deleted place with ID: ${id}`);

    return {
      message: 'Place deleted successfully',
      id: id
    };
  }
  
  // Methods for tag management
  
  async createTag(createTagDto: CreateTagDto) {
    this.logger.log('Creating new tag');
    
    // Check if tag with this name already exists
    const existingTag = await this.tagRepository.findOne({
      where: { name: createTagDto.name }
    });
    
    if (existingTag) {
      throw new BadRequestException('A tag with this name already exists');
    }
    
    const tag = new Tag();
    tag.name = createTagDto.name;
    tag.createdAt = new Date();
    tag.updatedAt = new Date();
    
    const savedTag = await this.tagRepository.save(tag);
    
    // Convert to DTO and return
    const tagDto = new TagResponseDto();
    tagDto.id = savedTag.id;
    tagDto.name = savedTag.name;
    tagDto.createdAt = savedTag.createdAt;
    tagDto.updatedAt = savedTag.updatedAt;
    
    return tagDto;
  }
  
  async getAllTags(): Promise<TagResponseDto[]> {
    this.logger.log('Getting all tags');
    
    const tags = await this.tagRepository.find({
      order: { name: 'ASC' }
    });
    
    return tags.map(tag => {
      const tagDto = new TagResponseDto();
      tagDto.id = tag.id;
      tagDto.name = tag.name;
      tagDto.createdAt = tag.createdAt;
      tagDto.updatedAt = tag.updatedAt;
      return tagDto;
    });
  }
  
  async getTagById(id: string): Promise<TagResponseDto> {
    this.logger.log(`Getting tag with ID: ${id}`);
    
    const tag = await this.tagRepository.findOne({ where: { id } });
    
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }
    
    const tagDto = new TagResponseDto();
    tagDto.id = tag.id;
    tagDto.name = tag.name;
    tagDto.createdAt = tag.createdAt;
    tagDto.updatedAt = tag.updatedAt;
    
    return tagDto;
  }
  
  async updateTag(id: string, updateTagDto: UpdateTagDto): Promise<TagResponseDto> {
    this.logger.log(`Updating tag with ID: ${id}`);
    
    const tag = await this.tagRepository.findOne({ where: { id } });
    
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }
    
    // Check if the new name already exists (excluding current tag)
    if (updateTagDto.name) {
      const existingTag = await this.tagRepository.findOne({
        where: { name: updateTagDto.name, id: Raw(alias => `${alias} != :id`, { id }) }
      });
      
      if (existingTag) {
        throw new BadRequestException('A tag with this name already exists');
      }
      
      tag.name = updateTagDto.name;
    }
    
    tag.updatedAt = new Date();
    
    const updatedTag = await this.tagRepository.save(tag);
    
    const tagDto = new TagResponseDto();
    tagDto.id = updatedTag.id;
    tagDto.name = updatedTag.name;
    tagDto.createdAt = updatedTag.createdAt;
    tagDto.updatedAt = updatedTag.updatedAt;
    
    return tagDto;
  }
  
  async deleteTag(id: string): Promise<void> {
    this.logger.log(`Deleting tag with ID: ${id}`);
    
    const tag = await this.tagRepository.findOne({ where: { id } });
    
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }
    
    // Check if any places are using this tag
    const placesWithThisTag = await this.placeRepository
      .createQueryBuilder('place')
      .innerJoin('place.tags', 'tag')
      .where('tag.id = :tagId', { tagId: id })
      .getCount();
      
    if (placesWithThisTag > 0) {
      throw new BadRequestException('Cannot delete tag because it is associated with one or more places');
    }
    
    await this.tagRepository.delete(id);
  }
}