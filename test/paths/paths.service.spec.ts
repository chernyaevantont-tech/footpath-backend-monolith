import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PathsService } from '../../src/paths/paths.service';
import { PathCalculationService } from '../../src/paths/utils/path-calculation.service';
import { AdvancedPathfindingService } from '../../src/paths/utils/advanced-pathfinding.service';
import { Path } from '../../src/paths/entities/path.entity';
import { PathPlace } from '../../src/paths/entities/path-place.entity';
import { Place } from '../../src/places/entities/place.entity';
import { CreatePathDto } from '../../src/paths/dto/create-path.dto';
import { UpdatePathDto } from '../../src/paths/dto/update-path.dto';
import { GeneratePathDto } from '../../src/paths/dto/generate-path.dto';
import { PathFilterDto } from '../../src/paths/dto/path-filter.dto';
import { PathStatus } from '../../src/paths/entities/path.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PathsService', () => {
  let service: PathsService;
  let pathRepository: Repository<Path>;
  let pathPlaceRepository: Repository<PathPlace>;
  let placeRepository: Repository<Place>;

  const mockPathRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPathPlaceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockPlaceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIds: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPathCalculationService = {
    calculateDistance: jest.fn(),
    estimateTravelTime: jest.fn(),
    getCoordinatesFromPlace: jest.fn(),
    calculatePathMetrics: jest.fn(),
  };

  const mockAdvancedPathfindingService = {
    calculateWalkingDistance: jest.fn(),
    estimateWalkingTime: jest.fn(),
    calculatePedestrianPathMetrics: jest.fn(),
    findOptimalPathSequence: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PathsService,
        PathCalculationService,
        AdvancedPathfindingService,
        { provide: getRepositoryToken(Path), useValue: mockPathRepository },
        { provide: getRepositoryToken(PathPlace), useValue: mockPathPlaceRepository },
        { provide: getRepositoryToken(Place), useValue: mockPlaceRepository },
        { provide: PathCalculationService, useValue: mockPathCalculationService },
        { provide: AdvancedPathfindingService, useValue: mockAdvancedPathfindingService },
      ],
    }).compile();

    service = module.get<PathsService>(PathsService);
    pathRepository = module.get<Repository<Path>>(getRepositoryToken(Path));
    pathPlaceRepository = module.get<Repository<PathPlace>>(getRepositoryToken(PathPlace));
    placeRepository = module.get<Repository<Place>>(getRepositoryToken(Place));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPath', () => {
    it('should create a new path successfully', async () => {
      const createPathDto: CreatePathDto = {
        name: 'Test Path',
        description: 'A test path',
        places: [
          { placeId: 'place1', order: 0, timeAtPlace: 60 },
          { placeId: 'place2', order: 1, timeAtPlace: 90 },
        ],
        status: 'published',
      };

      const mockPlace1 = { id: 'place1', coordinates: 'POINT(20.123 40.456)' } as Place;
      const mockPlace2 = { id: 'place2', coordinates: 'POINT(20.124 40.457)' } as Place;
      const mockPlaces = [mockPlace1, mockPlace2];

      const mockPath: Path = {
        id: 'path1',
        name: 'Test Path',
        description: 'A test path',
        status: PathStatus.PUBLISHED,
        distance: 1.2,
        totalTime: 180,
        pathPlaces: [],
      } as Path;

      jest.spyOn(placeRepository, 'findByIds').mockResolvedValue(mockPlaces);
      jest.spyOn(mockPathCalculationService, 'getCoordinatesFromPlace').mockReturnValue({ latitude: 40.456, longitude: 20.123 });
      jest.spyOn(mockPathCalculationService, 'calculateDistance').mockReturnValue(1.2);
      jest.spyOn(mockPathCalculationService, 'estimateTravelTime').mockReturnValue(15);
      jest.spyOn(mockPathCalculationService, 'calculatePathMetrics').mockReturnValue({ totalDistance: 1.2, totalTime: 180 });
      jest.spyOn(pathRepository, 'save').mockResolvedValue(mockPath);

      const result = await service.createPath(createPathDto);

      expect(placeRepository.findByIds).toHaveBeenCalledWith(['place1', 'place2']);
      expect(pathRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockPath);
    });

    it('should throw BadRequestException if places do not exist', async () => {
      const createPathDto: CreatePathDto = {
        name: 'Test Path',
        places: [
          { placeId: 'missing-place', order: 0, timeAtPlace: 60 },
        ],
      };

      jest.spyOn(placeRepository, 'findByIds').mockResolvedValue([]); // No places found

      await expect(service.createPath(createPathDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findPaths', () => {
    it('should find paths with filters', async () => {
      const filterDto: PathFilterDto = {
        name: 'Test',
        status: PathStatus.PUBLISHED,
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest.spyOn(pathRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.findPaths(filterDto);

      expect(pathRepository.createQueryBuilder).toHaveBeenCalledWith('path');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2); // name and status filters
    });
  });

  describe('getPathById', () => {
    it('should return a path when it exists', async () => {
      const mockPath = { id: 'path1', name: 'Test Path' } as Path;

      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(mockPath);

      const result = await service.getPathById('path1');

      expect(pathRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'path1' },
        relations: ['pathPlaces', 'pathPlaces.place']
      });
      expect(result).toEqual(mockPath);
    });

    it('should throw NotFoundException when path does not exist', async () => {
      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPathById('path1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePath', () => {
    it('should update a path successfully', async () => {
      const updatePathDto: UpdatePathDto = {
        name: 'Updated Path Name',
        description: 'Updated description',
      };

      const existingPath: Path = {
        id: 'path1',
        name: 'Original Name',
        description: 'Original description',
        status: PathStatus.DRAFT,
        pathPlaces: [],
      } as Path;

      const updatedPath: Path = {
        ...existingPath,
        name: 'Updated Path Name',
        description: 'Updated description',
      };

      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(existingPath);
      jest.spyOn(pathRepository, 'save').mockResolvedValue(updatedPath);

      const result = await service.updatePath('path1', updatePathDto);

      expect(pathRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'path1' },
        relations: ['pathPlaces']
      });
      expect(pathRepository.save).toHaveBeenCalledWith(updatedPath);
      expect(result).toEqual(updatedPath);
    });
  });

  describe('deletePath', () => {
    it('should delete a path successfully', async () => {
      const mockPath = { id: 'path1' } as Path;

      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(mockPath);
      jest.spyOn(pathRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      const result = await service.deletePath('path1');

      expect(pathRepository.findOne).toHaveBeenCalledWith({ where: { id: 'path1' } });
      expect(pathRepository.delete).toHaveBeenCalledWith('path1');
      expect(result).toEqual({ message: 'Path deleted successfully', id: 'path1' });
    });

    it('should throw NotFoundException when trying to delete non-existent path', async () => {
      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deletePath('path1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generatePath', () => {
    it('should generate a path with specified criteria', async () => {
      const generatePathDto: GeneratePathDto = {
        startPlaceId: 'place1',
        endPlaceId: 'place2',
        tags: ['nature', 'waterfront'],
        maxDuration: 120,
        maxDistance: 5,
        name: 'Generated Path',
      };

      const mockPlace1 = { id: 'place1', coordinates: 'POINT(20.123 40.456)', status: 'approved' } as Place;
      const mockPlace2 = { id: 'place2', coordinates: 'POINT(20.124 40.457)', status: 'approved' } as Place;
      const mockPotentialPlaces = [mockPlace1, mockPlace2];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };

      jest.spyOn(placeRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(mockQueryBuilder, 'getMany').mockResolvedValue(mockPotentialPlaces);
      jest.spyOn(placeRepository, 'findOne').mockResolvedValueOnce(mockPlace1).mockResolvedValueOnce(mockPlace2);
      jest.spyOn(mockAdvancedPathfindingService, 'findOptimalPathSequence').mockResolvedValue([mockPlace1, mockPlace2]);
      jest.spyOn(mockAdvancedPathfindingService, 'calculatePedestrianPathMetrics').mockResolvedValue({ totalDistance: 2.5, totalTime: 100 });
      jest.spyOn(pathRepository, 'save').mockResolvedValue({ id: 'new-path-id', name: 'Generated Path' } as Path);
      jest.spyOn(pathPlaceRepository, 'delete').mockResolvedValue({} as any);
      jest.spyOn(pathPlaceRepository, 'save').mockResolvedValue([] as any);
      jest.spyOn(service, 'getPathById').mockResolvedValue({ id: 'new-path-id', name: 'Generated Path' } as Path);

      const result = await service.generatePath(generatePathDto);

      expect(placeRepository.createQueryBuilder).toHaveBeenCalledWith('place');
      expect(mockAdvancedPathfindingService.findOptimalPathSequence).toHaveBeenCalledWith(
        mockPotentialPlaces,
        generatePathDto.startPlaceId,
        generatePathDto.endPlaceId,
        generatePathDto.maxDuration,
        generatePathDto.maxDistance
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if not enough places are found', async () => {
      const generatePathDto: GeneratePathDto = {
        tags: ['rare-tag'],
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };

      jest.spyOn(placeRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(mockQueryBuilder, 'getMany').mockResolvedValue([{} as Place]); // Only 1 place

      await expect(service.generatePath(generatePathDto)).rejects.toThrow(BadRequestException);
    });
  });
});