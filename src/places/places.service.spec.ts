import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { PlacesService } from './places.service';
import { Place } from './entities/place.entity';
import { Tag } from './entities/tag.entity';
import { PlaceModerationLog } from './entities/place-moderation-log.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { RedisService } from '../common/redis.service';
import { CreatePlaceDto } from './dto/place/create-place.dto';
import { PlaceStatus } from './entities/place.entity';
import { ModerationAction } from './entities/place-moderation-log.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTagDto } from './dto/tag/create-tag.dto';
import { UpdateTagDto } from './dto/tag/update-tag.dto';

describe('PlacesService', () => {
  let service: PlacesService;
  let mockPlaceRepository: Partial<Repository<Place>>;
  let mockTagRepository: Partial<Repository<Tag>>;
  let mockModerationLogRepository: Partial<Repository<PlaceModerationLog>>;
  let mockRecommendationsService: Partial<RecommendationsService>;
  let mockRedisService: Partial<RedisService>;

  const mockTag = {
    id: '1',
    name: 'Nature',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Tag;

  const mockPlace = {
    id: '1',
    name: 'Test Place',
    description: 'A test place',
    coordinates: 'POINT(1.0 1.0)',
    status: PlaceStatus.PENDING,
    creatorId: 'user1',
    tags: [mockTag],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Place;

  const mockModerationLog = {
    id: '1',
    placeId: '1',
    moderatorId: null,
    action: ModerationAction.SUBMITTED,
    reason: 'Place submitted for review',
    createdAt: new Date(),
  } as PlaceModerationLog;

  beforeEach(async () => {
    mockPlaceRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      findByIds: jest.fn(),
      delete: jest.fn(),
    };

    mockTagRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findByIds: jest.fn(),
      delete: jest.fn(),
    };

    mockModerationLogRepository = {
      save: jest.fn(),
    };

    mockRecommendationsService = {
      generateEmbedding: jest.fn(),
    };

    mockRedisService = {
      setJson: jest.fn(),
      getJson: jest.fn(),
      del: jest.fn(),
    };

    mockTagRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findByIds: jest.fn(),
      delete: jest.fn(),
    };

    mockModerationLogRepository = {
      save: jest.fn(),
    };

    // Mock the query builder
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockPlace], 1]),
    };
    
    (mockPlaceRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlacesService,
        {
          provide: getRepositoryToken(Place),
          useValue: mockPlaceRepository,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepository,
        },
        {
          provide: getRepositoryToken(PlaceModerationLog),
          useValue: mockModerationLogRepository,
        },
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<PlacesService>(PlacesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlace', () => {
    it('should create a new place successfully', async () => {
      const createPlaceDto: CreatePlaceDto = {
        name: 'Test Place',
        description: 'A test place',
        coordinates: { latitude: 1.0, longitude: 1.0 },
        tagIds: ['1'],
      };

      (mockTagRepository.findByIds as jest.Mock).mockResolvedValue([mockTag]);
      (mockPlaceRepository.save as jest.Mock).mockResolvedValue(mockPlace);
      (mockModerationLogRepository.save as jest.Mock).mockResolvedValue(mockModerationLog);

      const result = await service.createPlace(createPlaceDto, 'creatorId', 'user');

      expect(result.id).toBe(mockPlace.id);
      expect(result.name).toBe(mockPlace.name);
      expect(mockPlaceRepository.save).toHaveBeenCalled();
      expect(mockModerationLogRepository.save).toHaveBeenCalled();
    });

    it('should throw error if tag IDs are invalid', async () => {
      const createPlaceDto: CreatePlaceDto = {
        name: 'Test Place',
        description: 'A test place',
        coordinates: { latitude: 1.0, longitude: 1.0 },
        tagIds: ['invalid'],
      };

      (mockTagRepository.findByIds as jest.Mock).mockResolvedValue([]); // No tags found

      await expect(service.createPlace(createPlaceDto, 'creatorId', 'user')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findPlaces', () => {
    it('should return cached results if available', async () => {
      const mockCachedResult = {
        data: [mockPlace],
        meta: { page: 1, limit: 10, total: 1, pages: 1 }
      };
      (mockRedisService.getJson as jest.Mock).mockResolvedValue(mockCachedResult);

      const result = await service.findPlaces({});

      expect(result).toEqual(mockCachedResult);
    });

    it('should query places from database if not cached', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPlace], 1]),
      };

      (mockRedisService.getJson as jest.Mock).mockResolvedValue(null);
      (mockPlaceRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.findPlaces({});

      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
      expect(result.data[0].id).toBe(mockPlace.id);
    });
  });

  describe('getPlaceById', () => {
    it('should return place if it exists', async () => {
      (mockPlaceRepository.findOne as jest.Mock).mockResolvedValue(mockPlace);

      const result = await service.getPlaceById('1');

      expect(result.id).toBe(mockPlace.id);
      expect(result.name).toBe(mockPlace.name);
    });

    it('should throw NotFoundException if place does not exist', async () => {
      (mockPlaceRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getPlaceById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePlace', () => {
    it('should update place successfully', async () => {
      const updatePlaceDto = { name: 'Updated Name' };
      const updatedPlace = { ...mockPlace, name: 'Updated Name' };

      (mockPlaceRepository.findOne as jest.Mock).mockResolvedValue(mockPlace);
      (mockPlaceRepository.save as jest.Mock).mockResolvedValue(updatedPlace);

      const result = await service.updatePlace('1', updatePlaceDto, 'userId', 'user');

      expect(result.name).toBe('Updated Name');
      expect(mockPlaceRepository.save).toHaveBeenCalledWith(updatedPlace);
    });

    it('should throw NotFoundException if place does not exist', async () => {
      (mockPlaceRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.updatePlace('1', { name: 'Updated Name' }, 'userId', 'user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approvePlace', () => {
    it('should approve place and generate embedding', async () => {
      const approvedPlace = { ...mockPlace, status: PlaceStatus.APPROVED };

      (mockPlaceRepository.findOne as jest.Mock).mockResolvedValue(mockPlace);
      (mockPlaceRepository.save as jest.Mock).mockResolvedValue(approvedPlace);

      await service.approvePlace('1', 'moderatorId');

      expect(mockPlaceRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        status: PlaceStatus.APPROVED,
        moderatorId: 'moderatorId'
      }));
      expect(mockRecommendationsService.generateEmbedding).toHaveBeenCalled();
    });
  });

  describe('rejectPlace', () => {
    it('should reject place', async () => {
      const rejectedPlace = { ...mockPlace, status: PlaceStatus.REJECTED };

      (mockPlaceRepository.findOne as jest.Mock).mockResolvedValue(mockPlace);
      (mockPlaceRepository.save as jest.Mock).mockResolvedValue(rejectedPlace);

      await service.rejectPlace('1', 'moderatorId');

      expect(mockPlaceRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        status: PlaceStatus.REJECTED,
        moderatorId: 'moderatorId'
      }));
    });
  });

  describe('tag management', () => {
    describe('createTag', () => {
      it('should create a new tag successfully', async () => {
        const createTagDto: CreateTagDto = { name: 'New Tag' };
        const newTag = { ...mockTag, name: 'New Tag' };

        (mockTagRepository.findOne as jest.Mock).mockResolvedValue(null); // No existing tag
        (mockTagRepository.save as jest.Mock).mockResolvedValue(newTag);

        const result = await service.createTag(createTagDto);

        expect(result.name).toBe('New Tag');
        expect(mockTagRepository.save).toHaveBeenCalled();
      });

      it('should throw error if tag already exists', async () => {
        const createTagDto: CreateTagDto = { name: 'Existing Tag' };

        (mockTagRepository.findOne as jest.Mock).mockResolvedValue(mockTag); // Tag already exists

        await expect(service.createTag(createTagDto)).rejects.toThrow(BadRequestException);
      });
    });

    describe('getTagById', () => {
      it('should return tag if it exists', async () => {
        (mockTagRepository.findOne as jest.Mock).mockResolvedValue(mockTag);

        const result = await service.getTagById('1');

        expect(result.id).toBe(mockTag.id);
        expect(result.name).toBe(mockTag.name);
      });

      it('should throw NotFoundException if tag does not exist', async () => {
        (mockTagRepository.findOne as jest.Mock).mockResolvedValue(null);

        await expect(service.getTagById('1')).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateTag', () => {
      it('should update tag successfully', async () => {
        const updateTagDto: UpdateTagDto = { name: 'Updated Tag' };
        const updatedTag = { ...mockTag, name: 'Updated Tag' };

        (mockTagRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(mockTag)  // For the initial find
          .mockResolvedValueOnce(null);   // For the uniqueness check (no existing tag with new name)
        (mockTagRepository.save as jest.Mock).mockResolvedValue(updatedTag);

        const result = await service.updateTag('1', updateTagDto);

        expect(result.name).toBe('Updated Tag');
        expect(mockTagRepository.save).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Updated Tag'
        }));
      });
    });
  });
});