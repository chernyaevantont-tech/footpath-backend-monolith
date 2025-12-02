import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Path } from './entities/path.entity';
import { PathPlace } from './entities/path-place.entity';
import { Place } from '../places/entities/place.entity';
import { CreatePathDto } from './dto/create-path.dto';
import { UpdatePathDto } from './dto/update-path.dto';
import { GeneratePathDto } from './dto/generate-path.dto';
import { PathFilterDto } from './dto/path-filter.dto';
import { PathStatus } from './entities/path.entity';
import { PathCalculationService } from './utils/path-calculation.service';
import { AdvancedPathfindingService } from './utils/advanced-pathfinding.service';
import { PathResponseDto } from './dto/path-response.dto';
import { PathPlaceResponseDto } from './dto/path-place-response.dto';
import { PathsListResponseDto } from './dto/paths-list-response.dto';
import { PlaceResponseDto } from '../places/dto/place/place-response.dto';
import { UserResponseDto } from '../auth/dto/user-response.dto';

@Injectable()
export class PathsService {
  private readonly logger = new Logger(PathsService.name);

  constructor(
    @InjectRepository(Path)
    private pathRepository: Repository<Path>,
    @InjectRepository(PathPlace)
    private pathPlaceRepository: Repository<PathPlace>,
    @InjectRepository(Place)
    private placeRepository: Repository<Place>,
    private pathCalculationService: PathCalculationService,
    private advancedPathfindingService: AdvancedPathfindingService,
  ) {}

  // Helper method to convert Path entity to PathResponseDto
  private entityToDto(path: Path): PathResponseDto {
    const dto = new PathResponseDto();
    dto.id = path.id;
    dto.name = path.name;
    dto.description = path.description || null;
    dto.distance = path.distance;
    dto.totalTime = path.totalTime;
    dto.status = path.status;
    dto.creatorId = path.creatorId || null;
    dto.createdAt = path.createdAt;
    dto.updatedAt = path.updatedAt;

    // Convert path places to DTOs
    if (path.pathPlaces) {
      dto.pathPlaces = path.pathPlaces.map(pathPlace => {
        const pathPlaceDto = new PathPlaceResponseDto();
        pathPlaceDto.pathId = pathPlace.pathId;
        pathPlaceDto.placeId = pathPlace.placeId;
        pathPlaceDto.order = pathPlace.order;
        pathPlaceDto.timeSpent = pathPlace.timeAtPlace;

        // Create a simplified place DTO (could be expanded with more place details if needed)
        if (pathPlace.place) {
          const placeDto = new PlaceResponseDto();
          placeDto.id = pathPlace.place.id;
          placeDto.name = pathPlace.place.name;
          placeDto.description = pathPlace.place.description || null;
          placeDto.coordinates = pathPlace.place.coordinates;
          placeDto.status = pathPlace.place.status;
          placeDto.creatorId = pathPlace.place.creatorId || null;
          placeDto.moderatorId = pathPlace.place.moderatorId || null;
          placeDto.createdAt = pathPlace.place.createdAt;
          placeDto.updatedAt = pathPlace.place.updatedAt;
          placeDto.tags = pathPlace.place.tags ? pathPlace.place.tags.map(tag => {
            const tagDto = new (require('../places/dto/tag/tag-response.dto').TagResponseDto)();
            tagDto.id = tag.id;
            tagDto.name = tag.name;
            tagDto.createdAt = tag.createdAt;
            tagDto.updatedAt = tag.updatedAt;
            return tagDto;
          }) : [];
          pathPlaceDto.place = placeDto;
        }

        return pathPlaceDto;
      });
    } else {
      dto.pathPlaces = [];
    }

    // For now, creator is not returned in the response (would require an additional relation)
    // This could be added if needed
    dto.creator = path.creator ? this.mapUserToDto(path.creator) : null;

    return dto;
  }

  private mapUserToDto(user: any): UserResponseDto {
    const userDto = new UserResponseDto();
    userDto.id = user.id;
    userDto.email = user.email;
    userDto.role = user.role;
    userDto.createdAt = user.createdAt;
    userDto.updatedAt = user.updatedAt;
    return userDto;
  }

  async createPath(createPathDto: CreatePathDto) {
    this.logger.log('Creating new path');

    // Validate that all places in the path exist
    const placeIds = createPathDto.places.map(p => p.placeId);
    const existingPlaces = await this.placeRepository.findByIds(placeIds);

    if (existingPlaces.length !== placeIds.length) {
      const foundIds = existingPlaces.map(p => p.id);
      const missingIds = placeIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(`Places not found: ${missingIds.join(', ')}`);
    }

    // Get the places in the correct order
    const orderedPlaces = createPathDto.places
      .sort((a, b) => a.order - b.order)
      .map(p => {
        const place = existingPlaces.find(pl => pl.id === p.placeId);
        return { place, timeAtPlace: p.timeAtPlace };
      })
      .map(item => item.place);

    // Create the path
    const path = new Path();
    path.name = createPathDto.name;
    path.description = createPathDto.description || null;
    path.status = createPathDto.status as PathStatus || PathStatus.DRAFT;

    // Create path-place relationships with calculated travel times/distances
    const timeAtPlaces = createPathDto.places
      .sort((a, b) => a.order - b.order)
      .map(p => p.timeAtPlace);

    const pathPlaces = createPathDto.places
      .sort((a, b) => a.order - b.order)
      .map((placeData, index) => {
        const pathPlace = new PathPlace();
        pathPlace.placeId = placeData.placeId;
        pathPlace.order = placeData.order;
        pathPlace.timeAtPlace = placeData.timeAtPlace;

        // Calculate travel time from previous place if not the first
        if (index > 0) {
          const prevPlace = orderedPlaces[index - 1];
          const currPlace = orderedPlaces[index];

          if (prevPlace && currPlace) {
            const prevCoords = this.pathCalculationService.getCoordinatesFromPlace(prevPlace);
            const currCoords = this.pathCalculationService.getCoordinatesFromPlace(currPlace);

            const distance = this.pathCalculationService.calculateDistance(prevCoords, currCoords);
            const travelTime = this.pathCalculationService.estimateTravelTime(distance);

            pathPlace.distanceFromPrevious = distance;
            pathPlace.travelTimeFromPrevious = travelTime;
          }
        } else {
          // First place has no previous distance/travel time
          pathPlace.distanceFromPrevious = 0;
          pathPlace.travelTimeFromPrevious = 0;
        }

        return pathPlace;
      });

    path.pathPlaces = pathPlaces;

    // Calculate total distance and time
    const { totalDistance, totalTime } = this.pathCalculationService.calculatePathMetrics(orderedPlaces, timeAtPlaces);
    path.distance = totalDistance;
    path.totalTime = totalTime;

    const savedPath = await this.pathRepository.save(path);
    
    // Reload the path to ensure all relations are loaded
    const fullPath = await this.pathRepository.findOne({
      where: { id: savedPath.id },
      relations: ['pathPlaces', 'pathPlaces.place', 'creator']
    });

    return this.entityToDto(fullPath);
  }

  async findPaths(filterDto: PathFilterDto) {
    this.logger.log('Finding paths with filters');

    const queryBuilder = this.pathRepository.createQueryBuilder('path')
      .leftJoinAndSelect('path.pathPlaces', 'pathPlace')
      .leftJoinAndSelect('pathPlace.place', 'place')
      .leftJoinAndSelect('path.creator', 'creator');

    // Apply filters
    if (filterDto.name) {
      queryBuilder.andWhere('path.name ILIKE :name', { name: `%${filterDto.name}%` });
    }

    if (filterDto.description) {
      queryBuilder.andWhere('path.description ILIKE :description', { description: `%${filterDto.description}%` });
    }

    if (filterDto.creatorId) {
      queryBuilder.andWhere('path.creatorId = :creatorId', { creatorId: filterDto.creatorId });
    }

    if (filterDto.status) {
      queryBuilder.andWhere('path.status = :status', { status: filterDto.status });
    }

    // Filter by places included in path
    if (filterDto.placeIds && filterDto.placeIds.length > 0) {
      queryBuilder.andWhere('pathPlace.placeId IN (:...placeIds)', { placeIds: filterDto.placeIds });
    }

    // Set pagination
    const page = filterDto.page || 1;
    const limit = Math.min(filterDto.limit || 10, 100);
    const offset = (page - 1) * limit;

    queryBuilder
      .orderBy('path.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    const [paths, total] = await queryBuilder.getManyAndCount();

    return {
      data: paths.map(path => this.entityToDto(path)),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPathById(id: string) {
    const path = await this.pathRepository.findOne({
      where: { id },
      relations: ['pathPlaces', 'pathPlaces.place', 'creator']
    });

    if (!path) {
      throw new NotFoundException(`Path with ID ${id} not found`);
    }

    return this.entityToDto(path);
  }

  async updatePath(id: string, updatePathDto: UpdatePathDto) {
    const path = await this.pathRepository.findOne({
      where: { id },
      relations: ['pathPlaces']
    });

    if (!path) {
      throw new NotFoundException(`Path with ID ${id} not found`);
    }

    // Update basic fields if provided
    if (updatePathDto.name) path.name = updatePathDto.name;
    if (updatePathDto.description !== undefined) path.description = updatePathDto.description;
    if (updatePathDto.status) path.status = updatePathDto.status as PathStatus;

    // Update path places if provided
    if (updatePathDto.places) {
      // Validate that all places exist
      const placeIds = updatePathDto.places.map(p => p.placeId);
      const existingPlaces = await this.placeRepository.findByIds(placeIds);

      if (existingPlaces.length !== placeIds.length) {
        const foundIds = existingPlaces.map(p => p.id);
        const missingIds = placeIds.filter(id => !foundIds.includes(id));
        throw new BadRequestException(`Places not found: ${missingIds.join(', ')}`);
      }

      // Remove existing path places
      await this.pathPlaceRepository.delete({ pathId: id });

      // Get the places in the correct order
      const orderedPlaces = updatePathDto.places
        .sort((a, b) => a.order - b.order)
        .map(p => existingPlaces.find(pl => pl.id === p.placeId))
        .filter((place): place is Place => place !== undefined);

      // Add new path places with calculated distances and travel times
      const timeAtPlaces = updatePathDto.places
        .sort((a, b) => a.order - b.order)
        .map(p => p.timeAtPlace);

      const pathPlaces = updatePathDto.places
        .sort((a, b) => a.order - b.order)
        .map((placeData, index) => {
          const pathPlace = new PathPlace();
          pathPlace.pathId = id;
          pathPlace.placeId = placeData.placeId;
          pathPlace.order = placeData.order;
          pathPlace.timeAtPlace = placeData.timeAtPlace;

          // Calculate travel time from previous place if not the first
          if (index > 0) {
            const prevPlace = orderedPlaces[index - 1];
            const currPlace = orderedPlaces[index];

            if (prevPlace && currPlace) {
              const prevCoords = this.pathCalculationService.getCoordinatesFromPlace(prevPlace);
              const currCoords = this.pathCalculationService.getCoordinatesFromPlace(currPlace);

              const distance = this.pathCalculationService.calculateDistance(prevCoords, currCoords);
              const travelTime = this.pathCalculationService.estimateTravelTime(distance);

              pathPlace.distanceFromPrevious = distance;
              pathPlace.travelTimeFromPrevious = travelTime;
            }
          } else {
            // First place has no previous distance/travel time
            pathPlace.distanceFromPrevious = 0;
            pathPlace.travelTimeFromPrevious = 0;
          }

          return pathPlace;
        });

      path.pathPlaces = pathPlaces;

      // Update total distance and time for the path
      const { totalDistance, totalTime } = this.pathCalculationService.calculatePathMetrics(orderedPlaces, timeAtPlaces);
      path.distance = totalDistance;
      path.totalTime = totalTime;
    }

    const updatedPath = await this.pathRepository.save(path);
    
    // Reload the updated path to ensure all relations are loaded
    const fullPath = await this.pathRepository.findOne({
      where: { id: updatedPath.id },
      relations: ['pathPlaces', 'pathPlaces.place', 'creator']
    });

    return this.entityToDto(fullPath);
  }

  async deletePath(id: string) {
    const path = await this.pathRepository.findOne({ where: { id } });

    if (!path) {
      throw new NotFoundException(`Path with ID ${id} not found`);
    }

    await this.pathRepository.delete(id);
    return { message: 'Path deleted successfully', id };
  }

  // Generate path algorithm with proper time and distance calculations
  async generatePath(generatePathDto: GeneratePathDto) {
    this.logger.log('Generating path based on criteria');

    // Find places based on criteria (tags, duration, distance, etc.)
    let queryBuilder = this.placeRepository.createQueryBuilder('place')
      .where('place.status = :status', { status: 'approved' });

    if (generatePathDto.tags && generatePathDto.tags.length > 0) {
      queryBuilder = queryBuilder.andWhere('place.tagIds && ARRAY[:...tags]', { tags: generatePathDto.tags });
    }

    // Add logic to find places within a radius if coordinates are provided
    if (generatePathDto.startLatitude !== undefined && generatePathDto.startLongitude !== undefined) {
      queryBuilder = queryBuilder.andWhere(
        'ST_DWithin(place.coordinates, ST_Point(:startLongitude, :startLatitude)::geography, 5000)', // 5km radius
        { startLongitude: generatePathDto.startLongitude, startLatitude: generatePathDto.startLatitude }
      );
    }

    const allPotentialPlaces = await queryBuilder.getMany();

    if (allPotentialPlaces.length < 2) {
      throw new BadRequestException('Not enough places found matching your criteria to create a path');
    }

    // Use the advanced pathfinding service to optimize the path sequence
    let optimizedPlaces = await this.advancedPathfindingService.findOptimalPathSequence(
      allPotentialPlaces,
      generatePathDto.startPlaceId,
      generatePathDto.endPlaceId,
      generatePathDto.maxDuration,
      generatePathDto.maxDistance
    );

    // Limit to 10 places if needed
    optimizedPlaces = optimizedPlaces.slice(0, 10);

    // Create path-place relationships with proper calculations
    const path = new Path();
    path.name = generatePathDto.name || `Generated Path - ${new Date().toISOString()}`;
    path.description = generatePathDto.description || 'Auto-generated path';
    path.status = PathStatus.DRAFT;

    // Calculate pedestrian-aware distances and times
    const timeAtPlaces = optimizedPlaces.map(() => 60); // Default time at each place
    const { totalDistance, totalTime } = await this.advancedPathfindingService.calculatePedestrianPathMetrics(optimizedPlaces, timeAtPlaces);

    path.distance = totalDistance;
    path.totalTime = totalTime;

    const savedPath = await this.pathRepository.save(path);

    // Create path places with calculated distances and times
    const pathPlacePromises = optimizedPlaces.map(async (place, index) => {
      const pathPlace = new PathPlace();
      pathPlace.pathId = savedPath.id;
      pathPlace.placeId = place.id;
      pathPlace.order = index;
      pathPlace.timeAtPlace = 60; // Default time at place

      // Calculate travel time from previous place if not the first
      if (index > 0) {
        const prevPlace = optimizedPlaces[index - 1];
        const currPlace = optimizedPlaces[index];

        if (prevPlace && currPlace) {
          const prevCoords = this.pathCalculationService.getCoordinatesFromPlace(prevPlace);
          const currCoords = this.pathCalculationService.getCoordinatesFromPlace(currPlace);

          // Use pedestrian-aware distance calculation
          const distance = await this.advancedPathfindingService.calculateWalkingDistance(prevCoords, currCoords);
          const travelTime = this.advancedPathfindingService.estimateWalkingTime(distance);

          pathPlace.distanceFromPrevious = distance;
          pathPlace.travelTimeFromPrevious = travelTime;
        }
      } else {
        pathPlace.distanceFromPrevious = 0;
        pathPlace.travelTimeFromPrevious = 0;
      }

      return pathPlace;
    });

    const updatedPathPlaces = await Promise.all(pathPlacePromises);

    // Update the path places in the database
    await this.pathPlaceRepository.delete({ pathId: savedPath.id });
    await this.pathPlaceRepository.save(updatedPathPlaces);

    // Reload the path with updated path places
    return await this.getPathById(savedPath.id);
  }
}