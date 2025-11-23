import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PathsService } from '../../src/paths/paths.service';
import { PathCalculationService } from '../../src/paths/utils/path-calculation.service';
import { AdvancedPathfindingService } from '../../src/paths/utils/advanced-pathfinding.service';
import { Path } from '../../src/paths/entities/path.entity';
import { PathPlace } from '../../src/paths/entities/path-place.entity';
import { Place } from '../../src/places/entities/place.entity';
import { CreatePathDto } from '../../src/paths/dto/create-path.dto';
import { UpdatePathDto } from '../../src/paths/dto/update-path.dto';
import { GeneratePathDto } from '../../src/paths/dto/generate-path.dto';
import { PathStatus } from '../../src/paths/entities/path.entity';

describe('PathsService Edge Cases', () => {
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

  describe('createPath edge cases', () => {
    it('should handle creation with maximum number of places', async () => {
      const createPathDto: CreatePathDto = {
        name: 'Max Places Path',
        places: Array.from({ length: 50 }, (_, i) => ({
          placeId: `place${i}`,
          order: i,
          timeAtPlace: 60,
        })),
      };

      const mockPlaces = Array.from({ length: 50 }, (_, i) => ({
        id: `place${i}`,
        coordinates: `POINT(${i}.123 40.456)`,
      } as Place));

      jest.spyOn(placeRepository, 'findByIds').mockResolvedValue(mockPlaces);
      jest.spyOn(mockPathCalculationService, 'getCoordinatesFromPlace').mockReturnValue({ latitude: 40.456, longitude: 20.123 });
      jest.spyOn(mockPathCalculationService, 'calculateDistance').mockReturnValue(0.1);
      jest.spyOn(mockPathCalculationService, 'estimateTravelTime').mockReturnValue(1);
      jest.spyOn(mockPathCalculationService, 'calculatePathMetrics').mockReturnValue({ totalDistance: 10, totalTime: 3050 });
      jest.spyOn(pathRepository, 'save').mockResolvedValue({ id: 'new-path' } as Path);

      const result = await service.createPath(createPathDto);

      expect(result).toBeDefined();
      expect(placeRepository.findByIds).toHaveBeenCalledWith(expect.arrayContaining([`place0`, `place49`]));
    });

    it('should handle creation with zero time at places', async () => {
      const createPathDto: CreatePathDto = {
        name: 'Zero Time Path',
        places: [
          { placeId: 'place1', order: 0, timeAtPlace: 0 },
          { placeId: 'place2', order: 1, timeAtPlace: 0 },
        ],
      };

      const mockPlaces = [
        { id: 'place1', coordinates: 'POINT(20.123 40.456)' } as Place,
        { id: 'place2', coordinates: 'POINT(20.124 40.457)' } as Place,
      ];

      jest.spyOn(placeRepository, 'findByIds').mockResolvedValue(mockPlaces);
      jest.spyOn(mockPathCalculationService, 'getCoordinatesFromPlace').mockReturnValue({ latitude: 40.456, longitude: 20.123 });
      jest.spyOn(mockPathCalculationService, 'calculateDistance').mockReturnValue(0.1);
      jest.spyOn(mockPathCalculationService, 'estimateTravelTime').mockReturnValue(1);
      jest.spyOn(mockPathCalculationService, 'calculatePathMetrics').mockReturnValue({ totalDistance: 0.1, totalTime: 1 });
      jest.spyOn(pathRepository, 'save').mockResolvedValue({ id: 'new-path' } as Path);

      const result = await service.createPath(createPathDto);

      expect(result).toBeDefined();
    });

    it('should handle creation with multiple valid places', async () => {
      const createPathDto: CreatePathDto = {
        name: 'Multi-place Path',
        places: [
          { placeId: 'place1', order: 0, timeAtPlace: 60 },
          { placeId: 'place2', order: 1, timeAtPlace: 90 },
        ],
      };

      const mockPlaces = [
        { id: 'place1', coordinates: 'POINT(20.123 40.456)' } as Place,
        { id: 'place2', coordinates: 'POINT(20.124 40.457)' } as Place,
      ];

      jest.spyOn(placeRepository, 'findByIds').mockResolvedValue(mockPlaces);
      jest.spyOn(mockPathCalculationService, 'getCoordinatesFromPlace').mockReturnValue({ latitude: 40.456, longitude: 20.123 });
      jest.spyOn(mockPathCalculationService, 'calculateDistance').mockReturnValue(0.1);
      jest.spyOn(mockPathCalculationService, 'estimateTravelTime').mockReturnValue(1);
      jest.spyOn(mockPathCalculationService, 'calculatePathMetrics').mockReturnValue({ totalDistance: 0.1, totalTime: 151 });
      jest.spyOn(pathRepository, 'save').mockResolvedValue({ id: 'new-path' } as Path);

      const result = await service.createPath(createPathDto);

      expect(result).toBeDefined();
    });
  });

  describe('generatePath edge cases', () => {
    it('should handle generation with very strict constraints', async () => {
      const generatePathDto: GeneratePathDto = {
        startPlaceId: 'place1',
        endPlaceId: 'place2',
        maxDuration: 10, // Very short duration
        maxDistance: 0.1, // Very short distance
        tags: ['common-tag'],
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
      jest.spyOn(mockAdvancedPathfindingService, 'calculatePedestrianPathMetrics').mockResolvedValue({ totalDistance: 5, totalTime: 300 }); // Exceeds constraints
      jest.spyOn(pathRepository, 'save').mockResolvedValue({ id: 'new-path-id', name: 'Generated Path' } as Path);
      jest.spyOn(pathPlaceRepository, 'delete').mockResolvedValue({} as any);
      jest.spyOn(pathPlaceRepository, 'save').mockResolvedValue([] as any);
      jest.spyOn(service, 'getPathById').mockResolvedValue({ id: 'new-path-id', name: 'Generated Path' } as Path);

      const result = await service.generatePath(generatePathDto);

      expect(result).toBeDefined();
    });

    it('should handle generation with no constraints', async () => {
      const generatePathDto: GeneratePathDto = {
        tags: ['any-tag'],
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
      jest.spyOn(mockAdvancedPathfindingService, 'calculatePedestrianPathMetrics').mockResolvedValue({ totalDistance: 1.5, totalTime: 120 });
      jest.spyOn(pathRepository, 'save').mockResolvedValue({ id: 'new-path-id', name: 'Generated Path' } as Path);
      jest.spyOn(pathPlaceRepository, 'delete').mockResolvedValue({} as any);
      jest.spyOn(pathPlaceRepository, 'save').mockResolvedValue([] as any);
      jest.spyOn(service, 'getPathById').mockResolvedValue({ id: 'new-path-id', name: 'Generated Path' } as Path);

      const result = await service.generatePath(generatePathDto);

      expect(result).toBeDefined();
    });

    it('should handle generation with only start location', async () => {
      const generatePathDto: GeneratePathDto = {
        startPlaceId: 'place1',
        tags: ['nature'],
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
      jest.spyOn(placeRepository, 'findOne').mockResolvedValueOnce(mockPlace1);
      jest.spyOn(mockAdvancedPathfindingService, 'findOptimalPathSequence').mockResolvedValue([mockPlace1, mockPlace2]);
      jest.spyOn(mockAdvancedPathfindingService, 'calculatePedestrianPathMetrics').mockResolvedValue({ totalDistance: 1.0, totalTime: 90 });
      jest.spyOn(pathRepository, 'save').mockResolvedValue({ id: 'new-path-id', name: 'Generated Path' } as Path);
      jest.spyOn(pathPlaceRepository, 'delete').mockResolvedValue({} as any);
      jest.spyOn(pathPlaceRepository, 'save').mockResolvedValue([] as any);
      jest.spyOn(service, 'getPathById').mockResolvedValue({ id: 'new-path-id', name: 'Generated Path' } as Path);

      const result = await service.generatePath(generatePathDto);

      expect(result).toBeDefined();
    });
  });

  describe('updatePath edge cases', () => {
    it('should handle update with empty places array', async () => {
      const updatePathDto: UpdatePathDto = {
        name: 'Updated Name',
        places: [], // Empty places
      };

      const existingPath: Path = {
        id: 'path1',
        name: 'Original Name',
        status: PathStatus.DRAFT,
        pathPlaces: [{ id: 'pp1', placeId: 'place1', order: 0 } as PathPlace],
      } as Path;

      const updatedPath: Path = {
        ...existingPath,
        name: 'Updated Name',
      };

      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(existingPath);
      jest.spyOn(pathRepository, 'save').mockResolvedValue(updatedPath);
      jest.spyOn(pathPlaceRepository, 'delete').mockResolvedValue({} as any);
      jest.spyOn(placeRepository, 'findByIds').mockResolvedValue([]);

      const result = await service.updatePath('path1', updatePathDto);

      expect(pathRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'path1' },
        relations: ['pathPlaces']
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should handle update with different order values', async () => {
      const updatePathDto: UpdatePathDto = {
        places: [
          { placeId: 'place2', order: 0, timeAtPlace: 60 },
          { placeId: 'place1', order: 1, timeAtPlace: 90 },
        ], // Reversed order
      };

      const mockPlace1 = { id: 'place1', coordinates: 'POINT(20.123 40.456)' } as Place;
      const mockPlace2 = { id: 'place2', coordinates: 'POINT(20.124 40.457)' } as Place;
      const existingPath: Path = {
        id: 'path1',
        name: 'Original Name',
        status: PathStatus.DRAFT,
        pathPlaces: [],
      } as Path;

      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(existingPath);
      jest.spyOn(placeRepository, 'findByIds').mockResolvedValue([mockPlace2, mockPlace1]);
      jest.spyOn(mockPathCalculationService, 'getCoordinatesFromPlace').mockReturnValue({ latitude: 40.456, longitude: 20.123 });
      jest.spyOn(mockPathCalculationService, 'calculateDistance').mockReturnValue(0.1);
      jest.spyOn(mockPathCalculationService, 'estimateTravelTime').mockReturnValue(1);
      jest.spyOn(mockPathCalculationService, 'calculatePathMetrics').mockReturnValue({ totalDistance: 0.1, totalTime: 151 });
      jest.spyOn(pathRepository, 'save').mockResolvedValue({ id: 'path1', distance: 0.1, totalTime: 151 } as Path);

      const result = await service.updatePath('path1', updatePathDto);

      expect(result).toBeDefined();
    });
  });

  describe('getPathById edge cases', () => {
    it('should handle very long path ID gracefully', async () => {
      const veryLongId = 'a'.repeat(100);

      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPathById(veryLongId)).rejects.toThrow(NotFoundException);
    });

    it('should handle special characters in path ID', async () => {
      const specialId = 'path-id_with.special@chars';

      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPathById(specialId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('path metrics calculation edge cases', () => {
    it('should handle paths with only one place', async () => {
      const createPathDto: CreatePathDto = {
        name: 'Single Place Path',
        places: [
          { placeId: 'place1', order: 0, timeAtPlace: 60 },
        ],
      };

      const mockPlace = { id: 'place1', coordinates: 'POINT(20.123 40.456)' } as Place;

      jest.spyOn(placeRepository, 'findByIds').mockResolvedValue([mockPlace]);
      jest.spyOn(mockPathCalculationService, 'getCoordinatesFromPlace').mockReturnValue({ latitude: 40.456, longitude: 20.123 });
      jest.spyOn(mockPathCalculationService, 'calculatePathMetrics').mockReturnValue({ totalDistance: 0, totalTime: 60 }); // Only time at place, no travel
      jest.spyOn(pathRepository, 'save').mockResolvedValue({ id: 'new-path' } as Path);

      const result = await service.createPath(createPathDto);

      expect(mockPathCalculationService.calculatePathMetrics).toHaveBeenCalledWith([mockPlace], [60]);
      expect(result).toBeDefined();
    });

    it('should handle places with invalid coordinates', async () => {
      const createPathDto: CreatePathDto = {
        name: 'Path with Invalid Coords',
        places: [
          { placeId: 'place1', order: 0, timeAtPlace: 60 },
        ],
      };

      const mockPlace = { id: 'place1', coordinates: 'INVALID_FORMAT' } as Place;

      jest.spyOn(placeRepository, 'findByIds').mockResolvedValue([mockPlace]);
      jest.spyOn(mockPathCalculationService, 'getCoordinatesFromPlace').mockImplementation(() => {
        throw new Error('Invalid coordinates format');
      });

      // The error is caught internally and handled, so the call should not throw
      const result = await service.createPath(createPathDto);
      expect(result).toBeDefined();
    });
  });
});