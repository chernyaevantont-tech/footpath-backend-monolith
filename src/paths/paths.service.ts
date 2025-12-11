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
import { OSRMService } from './utils/osrm.service';
import { TimeCalculationService } from './utils/time-calculation.service';
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
    private osrmService: OSRMService,
    private timeCalculationService: TimeCalculationService,
  ) {}

  // Helper method to convert Path entity to PathResponseDto
  private async entityToDto(path: Path): Promise<PathResponseDto> {
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

    // Generate route geometry and steps using OSRM
    const { geometry, steps } = await this.generateRouteGeometry(path);
    dto.geometry = geometry;
    dto.steps = steps;

    return dto;
  }

  /**
   * Generate route geometry and steps using OSRM
   */
  private async generateRouteGeometry(path: Path): Promise<{ geometry: { type: 'LineString'; coordinates: number[][] } | null; steps: any[] | null }> {
    try {
      // Extract coordinates from path places
      if (!path.pathPlaces || path.pathPlaces.length < 2) {
        this.logger.warn(`Path ${path.id} has less than 2 places, cannot generate geometry`);
        return { geometry: null, steps: null };
      }

      // Sort places by order
      const sortedPlaces = [...path.pathPlaces].sort((a, b) => a.order - b.order);

      // Extract coordinates from places
      const coordinates = sortedPlaces
        .filter(pp => pp.place && pp.place.coordinates)
        .map(pp => {
          const geoJson = pp.place.coordinates as any;
          const [longitude, latitude] = geoJson.coordinates;
          return { longitude, latitude };
        });

      if (coordinates.length < 2) {
        this.logger.warn(`Path ${path.id} has insufficient valid coordinates`);
        return { geometry: null, steps: null };
      }

      // Call OSRM to calculate route
      const route = await this.osrmService.calculateRoute(coordinates);

      // Extract steps from OSRM response
      const steps = route.legs?.flatMap(leg => 
        leg.steps.map(step => ({
          instruction: step.name || 'Continue',
          distance: step.distance,
          duration: step.duration,
          maneuver: {
            type: step.maneuver.type,
            modifier: step.maneuver.modifier,
            location: step.maneuver.location,
          },
        }))
      ) || null;

      return { geometry: route.geometry, steps };
    } catch (error) {
      this.logger.error(`Failed to generate geometry for path ${path.id}: ${error.message}`);
      // Return null instead of throwing to allow path to be returned without geometry
      return { geometry: null, steps: null };
    }
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

    return await this.entityToDto(fullPath);
  }

  async findPaths(filterDto: PathFilterDto, userId?: string) {
    this.logger.log('Finding paths with filters', { filterDto, userId });

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
    } else if (userId) {
      // If no specific creatorId is provided but we have a user, only show paths they created
      // This is for access control - users can only see their own paths
      queryBuilder.andWhere('path.creatorId = :userId', { userId });
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
      data: await Promise.all(paths.map(path => this.entityToDto(path))),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPathById(id: string, userId?: string) {
    const path = await this.pathRepository.findOne({
      where: { id },
      relations: ['pathPlaces', 'pathPlaces.place', 'creator']
    });

    if (!path) {
      throw new NotFoundException(`Path with ID ${id} not found`);
    }

    // Check if user is the creator of the path
    if (userId && path.creatorId !== userId) {
      throw new NotFoundException('Path not found or you do not have access to this path');
    }

    return await this.entityToDto(path);
  }

  async updatePath(id: string, updatePathDto: UpdatePathDto, userId: string) {
    const path = await this.pathRepository.findOne({
      where: { id },
      relations: ['pathPlaces']
    });

    if (!path) {
      throw new NotFoundException(`Path with ID ${id} not found`);
    }

    // Check if user is the creator of the path
    if (path.creatorId !== userId) {
      throw new NotFoundException('Path not found or you do not have permission to update this path');
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

    return await this.entityToDto(fullPath);
  }

  async deletePath(id: string, userId: string) {
    const path = await this.pathRepository.findOne({ where: { id } });

    if (!path) {
      throw new NotFoundException(`Path with ID ${id} not found`);
    }

    // Check if user is the creator of the path
    if (path.creatorId !== userId) {
      throw new NotFoundException('Path not found or you do not have permission to delete this path');
    }

    await this.pathRepository.delete(id);
    return { message: 'Path deleted successfully', id };
  }

  /**
   * Select optimal places using greedy nearest-neighbor algorithm
   * considering time and distance constraints
   */
  private async selectOptimalPlaces(
    allPlaces: Place[],
    criteria: {
      startPlaceId?: string;
      endPlaceId?: string;
      startLatitude?: number;
      startLongitude?: number;
      maxPlaces: number;
      maxDistance: number;
      walkingSpeed: number;
      totalTime: number;
    },
  ): Promise<Place[]> {
    const selectedPlaces: Place[] = [];
    const remainingPlaces = [...allPlaces];
    let totalDistance = 0;
    
    // Start point
    let currentLat: number;
    let currentLng: number;
    
    if (criteria.startPlaceId) {
      const startPlace = remainingPlaces.find(p => p.id === criteria.startPlaceId);
      if (startPlace) {
        selectedPlaces.push(startPlace);
        const coords = this.pathCalculationService.getCoordinatesFromPlace(startPlace);
        currentLat = coords.latitude;
        currentLng = coords.longitude;
        remainingPlaces.splice(remainingPlaces.indexOf(startPlace), 1);
      }
    } else if (criteria.startLatitude && criteria.startLongitude) {
      currentLat = criteria.startLatitude;
      currentLng = criteria.startLongitude;
    } else {
      throw new BadRequestException('Start point must be specified');
    }
    
    // Greedy algorithm: repeatedly add nearest place that fits constraints
    while (remainingPlaces.length > 0 && selectedPlaces.length < criteria.maxPlaces) {
      let nearestPlace: Place | null = null;
      let nearestDistance = Infinity;
      
      // Find nearest place
      for (const place of remainingPlaces) {
        const coords = this.pathCalculationService.getCoordinatesFromPlace(place);
        const distance = this.pathCalculationService.calculateDistance(
          { latitude: currentLat, longitude: currentLng },
          coords,
        );
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPlace = place;
        }
      }
      
      if (!nearestPlace) break;
      
      // Check if adding this place exceeds constraints
      const potentialTotalDistance = totalDistance + nearestDistance;
      
      // Check distance constraint
      if (potentialTotalDistance > criteria.maxDistance) {
        this.logger.log(`Stopping: distance limit reached (${potentialTotalDistance.toFixed(2)} > ${criteria.maxDistance})`);
        break;
      }
      
      // Check time constraint
      const walkingTime = this.timeCalculationService.calculateWalkingTime(
        potentialTotalDistance,
        criteria.walkingSpeed,
      );
      const timeAtPlaces = (selectedPlaces.length + 1) * 15; // 15 min per place
      const totalTime = walkingTime + timeAtPlaces + 15; // +15 buffer
      
      if (totalTime > criteria.totalTime) {
        this.logger.log(`Stopping: time limit reached (${totalTime} > ${criteria.totalTime})`);
        break;
      }
      
      // Add place
      selectedPlaces.push(nearestPlace);
      totalDistance = potentialTotalDistance;
      
      const coords = this.pathCalculationService.getCoordinatesFromPlace(nearestPlace);
      currentLat = coords.latitude;
      currentLng = coords.longitude;
      
      remainingPlaces.splice(remainingPlaces.indexOf(nearestPlace), 1);
    }
    
    // Add end place if specified and not already added
    if (criteria.endPlaceId && criteria.endPlaceId !== criteria.startPlaceId) {
      const endPlace = remainingPlaces.find(p => p.id === criteria.endPlaceId);
      if (endPlace && !selectedPlaces.find(p => p.id === criteria.endPlaceId)) {
        selectedPlaces.push(endPlace);
      }
    }
    
    this.logger.log(`Selected ${selectedPlaces.length} places, total distance: ${totalDistance.toFixed(2)} km`);
    
    if (selectedPlaces.length < 2) {
      throw new BadRequestException('Could not find enough places within the given constraints');
    }
    
    return selectedPlaces;
  }

  // Generate path algorithm with proper time and distance calculations
  async generatePath(generatePathDto: GeneratePathDto, userId?: string) {
    this.logger.log('Generating path based on new criteria', {
      totalTime: generatePathDto.totalTime,
      maxPlaces: generatePathDto.maxPlaces,
      walkingSpeed: generatePathDto.walkingSpeed,
      maxDistance: generatePathDto.maxDistance,
    });

    // Handle circular routes
    let effectiveEndPlaceId = generatePathDto.endPlaceId;
    let effectiveEndLatitude = generatePathDto.endLatitude;
    let effectiveEndLongitude = generatePathDto.endLongitude;

    if (generatePathDto.isCircular) {
      this.logger.log('Circular route requested');
      effectiveEndPlaceId = generatePathDto.startPlaceId;
      effectiveEndLatitude = generatePathDto.startLatitude;
      effectiveEndLongitude = generatePathDto.startLongitude;
    }

    // Calculate constraints based on user input
    const maxPlaces = generatePathDto.maxPlaces || 10; // Default 10 places
    const timePerPlace = 15; // minutes
    
    // Calculate maximum walking time available
    const maxWalkingTime = this.timeCalculationService.calculateMaxWalkingTime(
      generatePathDto.totalTime,
      maxPlaces,
      timePerPlace,
    );
    
    // Calculate maximum walking distance possible
    const maxWalkingDistance = this.timeCalculationService.calculateMaxDistance(
      maxWalkingTime,
      generatePathDto.walkingSpeed,
    );
    
    // Use the stricter constraint
    const effectiveMaxDistance = Math.min(
      generatePathDto.maxDistance,
      maxWalkingDistance,
    );
    
    this.logger.log('Calculated constraints', {
      maxWalkingTime,
      maxWalkingDistance,
      effectiveMaxDistance,
      maxPlaces,
    });

    // Find places based on criteria
    let queryBuilder = this.placeRepository.createQueryBuilder('place')
      .where('place.status = :status', { status: 'approved' });

    if (generatePathDto.tags && generatePathDto.tags.length > 0) {
      queryBuilder = queryBuilder.andWhere('place.tagIds && ARRAY[:...tags]', { tags: generatePathDto.tags });
    }

    // Find places within reasonable radius
    const searchRadius = effectiveMaxDistance * 1000; // Convert km to meters
    if (generatePathDto.startLatitude !== undefined && generatePathDto.startLongitude !== undefined) {
      queryBuilder = queryBuilder.andWhere(
        'ST_DWithin(place.coordinates, ST_Point(:startLongitude, :startLatitude)::geography, :radius)',
        { 
          startLongitude: generatePathDto.startLongitude, 
          startLatitude: generatePathDto.startLatitude,
          radius: searchRadius,
        }
      );
    }

    const allPotentialPlaces = await queryBuilder.getMany();

    if (allPotentialPlaces.length === 0) {
      throw new BadRequestException('No places found matching your criteria');
    }

    // Select optimal places using new algorithm
    let optimizedPlaces = await this.selectOptimalPlaces(
      allPotentialPlaces,
      {
        startPlaceId: generatePathDto.startPlaceId,
        endPlaceId: effectiveEndPlaceId,
        startLatitude: generatePathDto.startLatitude,
        startLongitude: generatePathDto.startLongitude,
        maxPlaces,
        maxDistance: effectiveMaxDistance,
        walkingSpeed: generatePathDto.walkingSpeed,
        totalTime: generatePathDto.totalTime,
      },
    );

    this.logger.log(`Optimized to ${optimizedPlaces.length} places`);

    // Check if we have enough places to build a route
    if (optimizedPlaces.length < 2) {
      throw new BadRequestException(
        'Unable to generate route: not enough places found within the specified constraints. ' +
        'Try increasing totalTime, maxDistance, or reducing maxPlaces.'
      );
    }

    // Get route geometry and steps from OSRM
    // Build coordinates array: start point → places → end point
    const coordinates = [];
    
    // Add start point if provided as coordinates (not as place)
    if (!generatePathDto.startPlaceId && 
        generatePathDto.startLatitude !== undefined && 
        generatePathDto.startLongitude !== undefined) {
      coordinates.push({
        longitude: generatePathDto.startLongitude,
        latitude: generatePathDto.startLatitude,
      });
    }
    
    // Add all optimized places
    optimizedPlaces.forEach(place => {
      const coords = this.pathCalculationService.getCoordinatesFromPlace(place);
      coordinates.push({ longitude: coords.longitude, latitude: coords.latitude });
    });
    
    // Add end point if provided as coordinates (not as place) and not circular
    if (!generatePathDto.isCircular && 
        !effectiveEndPlaceId && 
        effectiveEndLatitude !== undefined && 
        effectiveEndLongitude !== undefined) {
      coordinates.push({
        longitude: effectiveEndLongitude,
        latitude: effectiveEndLatitude,
      });
    }

    this.logger.log('Requesting route from OSRM with coordinates', { 
      count: coordinates.length,
      hasStartPoint: !generatePathDto.startPlaceId && generatePathDto.startLatitude !== undefined,
      hasEndPoint: !generatePathDto.isCircular && !effectiveEndPlaceId && effectiveEndLatitude !== undefined,
    });

    let osrmRoute;
    try {
      osrmRoute = await this.osrmService.calculateRoute(coordinates);
    } catch (error) {
      this.logger.error('OSRM routing failed', error);
      throw new BadRequestException('Failed to generate route geometry');
    }

    // Calculate actual route metrics from OSRM
    const actualDistance = osrmRoute.distance / 1000; // Convert meters to km
    const actualWalkingTime = this.timeCalculationService.calculateWalkingTime(
      actualDistance,
      generatePathDto.walkingSpeed,
    );
    
    // Calculate total time with place visits and buffer
    const timeBreakdown = this.timeCalculationService.calculateTimeBreakdown({
      distanceKm: actualDistance,
      walkingSpeedKmh: generatePathDto.walkingSpeed,
      numberOfPlaces: optimizedPlaces.length,
      timePerPlaceMinutes: timePerPlace,
    });

    this.logger.log('Route metrics from OSRM', {
      actualDistance,
      actualWalkingTime,
      timeBreakdown,
    });

    // Create path entity
    const path = new Path();
    path.name = generatePathDto.name || `Generated Path - ${new Date().toISOString()}`;
    path.description = generatePathDto.description || 'Auto-generated walking path';
    path.status = PathStatus.DRAFT;
    path.distance = actualDistance;
    path.totalTime = timeBreakdown.totalTime;
    path.isCircular = generatePathDto.isCircular || false;
    path.geometry = osrmRoute.geometry;
    path.steps = osrmRoute.steps;
    
    if (userId) {
      path.creatorId = userId;
    }

    const savedPath = await this.pathRepository.save(path);
    this.logger.log(`Path saved with ID: ${savedPath.id}`);

    // Create path-place relationships
    const pathPlaces: PathPlace[] = [];
    for (let i = 0; i < optimizedPlaces.length; i++) {
      const pathPlace = new PathPlace();
      pathPlace.pathId = savedPath.id;
      pathPlace.placeId = optimizedPlaces[i].id;
      pathPlace.order = i;
      pathPlace.timeSpent = timePerPlace; // 15 minutes per place

      // Calculate distance and time from previous place
      if (i > 0 && osrmRoute.legs && osrmRoute.legs[i - 1]) {
        const leg = osrmRoute.legs[i - 1];
        pathPlace.distanceFromPrevious = leg.distance / 1000; // meters to km
        pathPlace.travelTimeFromPrevious = this.timeCalculationService.calculateWalkingTime(
          pathPlace.distanceFromPrevious,
          generatePathDto.walkingSpeed,
        );
      } else {
        pathPlace.distanceFromPrevious = 0;
        pathPlace.travelTimeFromPrevious = 0;
      }

      pathPlaces.push(pathPlace);
    }

    await this.pathPlaceRepository.save(pathPlaces);
    this.logger.log(`Saved ${pathPlaces.length} path-place relationships`);

    // Return the complete path with all relations
    const completePath = await this.pathRepository.findOne({
      where: { id: savedPath.id },
      relations: ['pathPlaces', 'pathPlaces.place', 'pathPlaces.place.tags', 'creator'],
    });

    if (!completePath) {
      throw new NotFoundException('Path was created but could not be retrieved');
    }

    this.logger.log('Path generation completed successfully', {
      pathId: completePath.id,
      places: completePath.pathPlaces.length,
      distance: completePath.distance,
      totalTime: completePath.totalTime,
    });

    return completePath;
  }
}