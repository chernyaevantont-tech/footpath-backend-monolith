import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecommendationsService } from '../../src/recommendations/recommendations.service';
import { PlaceEmbedding } from '../../src/recommendations/entities/place-embedding.entity';
import { Place } from '../../src/places/entities/place.entity';
import { User } from '../../src/auth/entities/user.entity';
import { Walk } from '../../src/walks/entities/walk.entity';
import { WalkParticipant } from '../../src/walks/entities/walk-participant.entity';
import { Path } from '../../src/paths/entities/path.entity';
import { PathPlace } from '../../src/paths/entities/path-place.entity';
import { PlaceStatus } from '../../src/places/entities/place.entity';
import { WalkStatus } from '../../src/walks/entities/walk.entity';
import { GetPlaceRecommendationsDto, GenerateEmbeddingDto } from '../../src/recommendations/dto/recommendation.dto';
import { PlacesService } from '../../src/places/places.service';
import { MockEmbeddingGenerator } from '../../src/recommendations/recommendations.service';
import { RedisService } from '../../src/common/redis.service';

describe('RecommendationsService Edge Cases', () => {
  let service: RecommendationsService;
  let placeEmbeddingRepository: Repository<PlaceEmbedding>;
  let placeRepository: Repository<Place>;
  let dataSource: DataSource;

  const mockPlaceEmbeddingRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPlaceRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockWalkRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockWalkParticipantRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    createQueryBuilder: jest.fn(),
  };

  const mockPlacesService = {};

  beforeEach(async () => {
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
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: PlacesService,
          useValue: mockPlacesService,
        },
        {
          provide: RedisService,
          useValue: {
            getJson: jest.fn(),
            setJson: jest.fn(),
            del: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            exists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    placeEmbeddingRepository = module.get<Repository<PlaceEmbedding>>(getRepositoryToken(PlaceEmbedding));
    placeRepository = module.get<Repository<Place>>(getRepositoryToken(Place));
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should handle empty embeddings array', async () => {
    // Mock empty embeddings
    (placeEmbeddingRepository.find as jest.Mock).mockResolvedValue([]);

    // Mock the getUserVisitedPlaceIds method to return an empty array
    jest.spyOn(service as any, 'getUserVisitedPlaceIds').mockResolvedValue([]);

    // Mock the query builder to handle the getSimilarPlacesByEmbedding method
    const mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    (placeRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    const result = await (service as any).getSimilarPlacesByEmbedding([], 'user-1', 10, []);
    expect(result).toEqual([]);
  });

  it('should handle generateEmbedding when place already exists', async () => {
    const generateEmbeddingDto: GenerateEmbeddingDto = {
      placeId: 'place-1',
      name: 'Test Place',
      description: 'Test description',
      tags: ['tag1', 'tag2'],
    };

    const existingEmbedding = {
      id: 'embedding-1',
      placeId: 'place-1',
      embedding: [0.5, 0.6, 0.7],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockEmbedding = [0.1, 0.2, 0.3];
    jest.spyOn(MockEmbeddingGenerator, 'generateEmbedding').mockReturnValue(mockEmbedding);
    (placeEmbeddingRepository.findOne as jest.Mock).mockResolvedValue(existingEmbedding);
    (placeEmbeddingRepository.save as jest.Mock).mockResolvedValue({
      ...existingEmbedding,
      embedding: mockEmbedding,
      updatedAt: new Date(),
    });

    const result = await service.generateEmbedding(generateEmbeddingDto);

    expect(placeEmbeddingRepository.findOne).toHaveBeenCalledWith({ where: { placeId: 'place-1' } });
    expect(placeEmbeddingRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      embedding: mockEmbedding,
      updatedAt: expect.any(Date),
    }));
    expect(result.id).toBe('embedding-1');
  });

  it('should handle generateEmbedding when place ID does not exist in database', async () => {
    const generateEmbeddingDto: GenerateEmbeddingDto = {
      placeId: 'nonexistent-place',
      name: 'Test Place',
      description: 'Test description',
      tags: ['tag1', 'tag2'],
    };

    const mockEmbedding = [0.1, 0.2, 0.3];
    jest.spyOn(MockEmbeddingGenerator, 'generateEmbedding').mockReturnValue(mockEmbedding);
    (placeEmbeddingRepository.findOne as jest.Mock).mockResolvedValue(null);
    
    // Mock successful save
    (placeEmbeddingRepository.save as jest.Mock).mockResolvedValue({
      id: expect.any(String),
      placeId: 'nonexistent-place',
      embedding: mockEmbedding,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });

    const result = await service.generateEmbedding(generateEmbeddingDto);

    expect(placeEmbeddingRepository.findOne).toHaveBeenCalledWith({ where: { placeId: 'nonexistent-place' } });
    expect(placeEmbeddingRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      placeId: 'nonexistent-place',
      embedding: mockEmbedding,
    }));
  });

  it('should handle empty user visited place IDs', async () => {
    const userId = 'user-1';
    const dto: GetPlaceRecommendationsDto = { limit: 10 };

    // Mock empty visited places
    jest.spyOn(service as any, 'getUserVisitedPlaceIds').mockResolvedValue([]);
    
    // Mock fallback query
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    (placeRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    const result = await service.getRecommendedPlaces(userId, dto);

    expect(result).toEqual([]);
  });

  it('should handle very high limit in GetPlaceRecommendationsDto', async () => {
    const userId = 'user-1';
    const dto: GetPlaceRecommendationsDto = { limit: 10000 }; // Very high limit
    
    // Mock empty visited places to trigger fallback
    jest.spyOn(service as any, 'getUserVisitedPlaceIds').mockResolvedValue([]);
    
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    
    (placeRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    const result = await service.getRecommendedPlaces(userId, dto);

    // The query builder should have been called with the limit
    expect(mockQueryBuilder.limit).toHaveBeenCalledWith(dto.limit);
  });

  it('should handle generate embeddings when no places without embeddings exist', async () => {
    const mockRawQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    (mockDataSource.createQueryBuilder as jest.Mock).mockReturnValue(mockRawQueryBuilder);
    
    // Mock the generateEmbedding method
    const generateEmbeddingSpy = jest.spyOn(service, 'generateEmbedding');

    const result = await service.generateEmbeddingsForAllPlaces();

    expect(mockDataSource.createQueryBuilder).toHaveBeenCalled();
    expect(generateEmbeddingSpy).not.toHaveBeenCalled(); // Should not be called if no places to process
    expect(result).toBe(0);
  });

  it('should handle generate embeddings when there are processing errors', async () => {
    const mockPlacesWithoutEmbeddings = [
      { id: 'place-1', name: 'Place 1', description: 'Description', tagIds: ['tag1'] },
    ];

    const mockRawQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(mockPlacesWithoutEmbeddings),
    };

    (mockDataSource.createQueryBuilder as jest.Mock).mockReturnValue(mockRawQueryBuilder);

    // Mock the generateEmbedding method to throw an error
    jest.spyOn(service, 'generateEmbedding').mockRejectedValue(new Error('Database error'));

    const result = await service.generateEmbeddingsForAllPlaces();

    // Even with errors, it should return the count of attempted operations
    // In our implementation, the error is caught internally, so it should process the one item
    expect(mockDataSource.createQueryBuilder).toHaveBeenCalled();
    expect(result).toBe(0); // The error is caught internally and logged, so it won't be counted in try-catch
  });

  it('should handle recommendations when user has empty tag preferences', async () => {
    const userId = 'user-1';
    const dto: GetPlaceRecommendationsDto = { 
      limit: 5,
      tags: [] // Empty array of tags
    };
    
    // Mock empty visited places to trigger fallback
    jest.spyOn(service as any, 'getUserVisitedPlaceIds').mockResolvedValue([]);
    
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(), // This should not be called since tags is empty
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    
    (placeRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    const result = await service.getRecommendedPlaces(userId, dto);

    // Verify the result and that the appropriate methods were called
    expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('place.tagIds && (:tags)', { tags: [] });
  });

  it('should handle very long text when generating embeddings', async () => {
    const generateEmbeddingDto: GenerateEmbeddingDto = {
      placeId: 'place-1',
      name: 'Test Place',
      description: 'A'.repeat(10000), // Very long description
      tags: ['tag1', 'tag2'],
    };

    const mockEmbedding = new Array(1536).fill(0.1);
    jest.spyOn(MockEmbeddingGenerator, 'generateEmbedding').mockReturnValue(mockEmbedding);
    (placeEmbeddingRepository.findOne as jest.Mock).mockResolvedValue(null);
    (placeEmbeddingRepository.save as jest.Mock).mockResolvedValue({
      id: 'embedding-1',
      placeId: 'place-1',
      embedding: mockEmbedding,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.generateEmbedding(generateEmbeddingDto);

    expect(MockEmbeddingGenerator.generateEmbedding).toHaveBeenCalledWith(
      expect.stringContaining('Test Place') // Should contain the place name
    );
    expect(result.embedding.length).toBe(1536); // Standard embedding size
  });
});