import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { RecommendationsService } from './recommendations.service';
import { Place } from '../places/entities/place.entity';
import { User } from '../auth/entities/user.entity';
import { PlaceEmbedding } from './entities/place-embedding.entity';
import { Walk } from '../walks/entities/walk.entity';
import { WalkParticipant } from '../walks/entities/walk-participant.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GenerateEmbeddingDto, GetPlaceRecommendationsDto } from './dto/recommendation.dto';
import { NotFoundException } from '@nestjs/common';
import { PlacesService } from '../places/places.service';
import { DataSource } from 'typeorm';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let mockPlaceRepository: Partial<Repository<Place>>;
  let mockUserRepository: Partial<Repository<User>>;
  let mockPlaceEmbeddingRepository: Partial<Repository<PlaceEmbedding>>;
  let mockWalkRepository: Partial<Repository<Walk>>;
  let mockWalkParticipantRepository: Partial<Repository<WalkParticipant>>;
  let mockPlacesService: Partial<PlacesService>;
  let mockDataSource: Partial<DataSource>;

  const mockPlace = {
    id: '1',
    name: 'Test Place',
    description: 'A test place',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Place;

  beforeEach(async () => {
    mockPlaceRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockUserRepository = {
      findOne: jest.fn(),
    };

    mockPlaceEmbeddingRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockWalkRepository = {
      createQueryBuilder: jest.fn(),
    };

    mockWalkParticipantRepository = {
      createQueryBuilder: jest.fn(),
    };

    mockPlacesService = {};

    mockDataSource = {
      createQueryBuilder: jest.fn(),
    };

    // Mock the query builders
    (mockWalkParticipantRepository.createQueryBuilder as jest.Mock).mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    });

    (mockPlaceRepository.createQueryBuilder as jest.Mock).mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });

    (mockDataSource.createQueryBuilder as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: getRepositoryToken(PlaceEmbedding),
          useValue: mockPlaceEmbeddingRepository,
        },
        {
          provide: getRepositoryToken(Place),
          useValue: mockPlaceRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Walk),
          useValue: mockWalkRepository,
        },
        {
          provide: getRepositoryToken(WalkParticipant),
          useValue: mockWalkParticipantRepository,
        },
        {
          provide: PlacesService,
          useValue: mockPlacesService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateEmbedding', () => {
    it('should generate and save new embedding for a place', async () => {
      const generateEmbeddingDto: GenerateEmbeddingDto = {
        placeId: '1',
        name: 'Test Place',
        description: 'A test place',
        tags: ['nature', 'outdoor'],
      };

      // Mock that no existing embedding exists
      (mockPlaceEmbeddingRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockPlaceEmbeddingRepository.save as jest.Mock).mockResolvedValue({
        placeId: '1',
        embedding: [0.1, 0.2, 0.3], // Mock embedding
        id: 'embedding-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.generateEmbedding(generateEmbeddingDto);

      expect(mockPlaceEmbeddingRepository.findOne).toHaveBeenCalledWith({ where: { placeId: '1' } });
      expect(mockPlaceEmbeddingRepository.save).toHaveBeenCalled();
      expect(result.placeId).toBe(generateEmbeddingDto.placeId);
    });

    it('should update existing embedding if it exists', async () => {
      const generateEmbeddingDto: GenerateEmbeddingDto = {
        placeId: '1',
        name: 'Test Place',
        description: 'Updated description',
        tags: ['nature'],
      };

      const existingEmbedding = {
        placeId: '1',
        embedding: [0.5, 0.6, 0.7],
        id: 'embedding-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock that an existing embedding exists
      (mockPlaceEmbeddingRepository.findOne as jest.Mock).mockResolvedValue(existingEmbedding);
      (mockPlaceEmbeddingRepository.save as jest.Mock).mockResolvedValue({
        ...existingEmbedding,
        embedding: [0.1, 0.2, 0.3],
        updatedAt: new Date(),
      });

      const result = await service.generateEmbedding(generateEmbeddingDto);

      expect(mockPlaceEmbeddingRepository.findOne).toHaveBeenCalledWith({ where: { placeId: '1' } });
      expect(mockPlaceEmbeddingRepository.save).toHaveBeenCalled();
      expect(result.placeId).toBe(generateEmbeddingDto.placeId);
    });
  });

  describe('getRecommendedPlaces', () => {
    it('should return recommended places for a user', async () => {
      // Mock the query builder for getUserVisitedPlaceIds
      const mockQueryBuilderForVisited = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      (mockWalkParticipantRepository.createQueryBuilder as jest.Mock).mockReturnValueOnce(mockQueryBuilderForVisited);

      // Mock the query builder for getSimilarPlacesByEmbedding or getPopularOrTaggedPlaces
      const mockQueryBuilderForPlaces = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPlace]),
      };
      (mockPlaceRepository.createQueryBuilder as jest.Mock).mockReturnValueOnce(mockQueryBuilderForPlaces);
      
      const result = await service.getRecommendedPlaces('user1', new GetPlaceRecommendationsDto());

      expect(result).toBeInstanceOf(Array);
    });
  });
});