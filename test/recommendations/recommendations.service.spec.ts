import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
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

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let placeEmbeddingRepository: Repository<PlaceEmbedding>;
  let placeRepository: Repository<Place>;
  let userRepository: Repository<User>;
  let walkRepository: Repository<Walk>;
  let walkParticipantRepository: Repository<WalkParticipant>;
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
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    placeEmbeddingRepository = module.get<Repository<PlaceEmbedding>>(getRepositoryToken(PlaceEmbedding));
    placeRepository = module.get<Repository<Place>>(getRepositoryToken(Place));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    walkRepository = module.get<Repository<Walk>>(getRepositoryToken(Walk));
    walkParticipantRepository = module.get<Repository<WalkParticipant>>(getRepositoryToken(WalkParticipant));
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateEmbedding', () => {
    it('should generate and save a new embedding', async () => {
      const generateEmbeddingDto: GenerateEmbeddingDto = {
        placeId: 'place-1',
        name: 'Test Place',
        description: 'Test description',
        tags: ['tag1', 'tag2'],
      };

      const mockEmbedding = [0.1, 0.2, 0.3];
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

      expect(MockEmbeddingGenerator.generateEmbedding).toHaveBeenCalledWith('Test Place Test description tag1 tag2');
      expect(placeEmbeddingRepository.findOne).toHaveBeenCalledWith({ where: { placeId: 'place-1' } });
      expect(placeEmbeddingRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        placeId: 'place-1',
        embedding: mockEmbedding,
      }));
      expect(result.placeId).toBe('place-1');
    });

    it('should update an existing embedding', async () => {
      const generateEmbeddingDto: GenerateEmbeddingDto = {
        placeId: 'place-1',
        name: 'Updated Place',
        description: 'Updated description',
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

      expect(MockEmbeddingGenerator.generateEmbedding).toHaveBeenCalledWith('Updated Place Updated description tag1 tag2');
      expect(placeEmbeddingRepository.findOne).toHaveBeenCalledWith({ where: { placeId: 'place-1' } });
      expect(placeEmbeddingRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        embedding: mockEmbedding,
        updatedAt: expect.any(Date),
      }));
      expect(result.id).toBe('embedding-1');
    });
  });

  describe('getRecommendedPlaces', () => {
    it('should return recommended places based on user history', async () => {
      const userId = 'user-1';
      const dto: GetPlaceRecommendationsDto = { limit: 5 };
      
      // Mock the user visited places
      jest.spyOn(service as any, 'getUserVisitedPlaceIds').mockResolvedValue(['place-1', 'place-2']);
      
      // Mock embeddings for visited places
      (placeEmbeddingRepository.find as jest.Mock).mockResolvedValue([
        { placeId: 'place-1', embedding: [0.1, 0.2, 0.3] },
        { placeId: 'place-2', embedding: [0.4, 0.5, 0.6] },
      ]);
      
      // Mock similar places query
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 'similar-place-1', name: 'Similar Place 1' },
          { id: 'similar-place-2', name: 'Similar Place 2' },
        ]),
      };

      (placeRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.getRecommendedPlaces(userId, dto);

      expect((service as any).getUserVisitedPlaceIds).toHaveBeenCalledWith(userId);
      expect(placeEmbeddingRepository.find).toHaveBeenCalledWith({
        where: { placeId: expect.anything() },
      });
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return popular places when user has no history', async () => {
      const userId = 'user-1';
      const dto: GetPlaceRecommendationsDto = { limit: 5 };
      
      // Mock empty visited places
      jest.spyOn(service as any, 'getUserVisitedPlaceIds').mockResolvedValue([]);
      
      // Mock fallback query
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 'popular-place-1', name: 'Popular Place 1' },
          { id: 'popular-place-2', name: 'Popular Place 2' },
        ]),
      };

      (placeRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.getRecommendedPlaces(userId, dto);

      expect((service as any).getUserVisitedPlaceIds).toHaveBeenCalledWith(userId);
      expect(placeRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getUserVisitedPlaceIds', () => {
    it('should return place IDs from completed walks', async () => {
      const userId = 'user-1';
      
      const mockRawResult = [
        { placeId: 'place-1' },
        { placeId: 'place-2' },
        { placeId: 'place-3' },
      ];
      
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockRawResult),
      };
      
      (walkParticipantRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await (service as any).getUserVisitedPlaceIds(userId);

      expect(walkParticipantRepository.createQueryBuilder).toHaveBeenCalledWith('wp');
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledTimes(3);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('wp.userId = :userId', { userId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('walk.status = :status', { status: WalkStatus.COMPLETED });
      expect(result).toEqual(['place-1', 'place-2', 'place-3']);
    });
  });

  describe('generateEmbeddingsForAllPlaces', () => {
    it('should generate embeddings for all places without embeddings', async () => {
      const mockPlacesWithoutEmbeddings = [
        { id: 'place-1', name: 'Place 1', description: 'Description', tagIds: ['tag1'] },
        { id: 'place-2', name: 'Place 2', description: 'Description', tagIds: ['tag2'] },
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
      
      // Mock the generateEmbedding method
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue({
        id: 'embedding-1',
        placeId: 'place-1',
        embedding: [0.1, 0.2, 0.3],
        createdAt: new Date(),
        updatedAt: new Date(),
        place: undefined, // Place is optional in the mock since it's a relation
      });

      const result = await service.generateEmbeddingsForAllPlaces();

      expect(mockDataSource.createQueryBuilder).toHaveBeenCalled();
      expect(service.generateEmbedding).toHaveBeenCalledTimes(2);
      expect(result).toBe(2); // Number of processed places
    });
  });
});