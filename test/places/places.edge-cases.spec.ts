import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PlacesService } from '../../src/places/places.service';
import { Place } from '../../src/places/entities/place.entity';
import { Tag } from '../../src/places/entities/tag.entity';
import { PlaceModerationLog } from '../../src/places/entities/place-moderation-log.entity';
import { CreatePlaceDto } from '../../src/places/dto/create-place.dto';
import { UpdatePlaceDto } from '../../src/places/dto/update-place.dto';
import { PlaceFilterDto } from '../../src/places/dto/place-filter.dto';
import { PlaceStatus } from '../../src/places/entities/place.entity';
import { ModerationAction } from '../../src/places/entities/place-moderation-log.entity';
import { User, UserRole } from '../../src/auth/entities/user.entity';
import { RecommendationsService } from '../../src/recommendations/recommendations.service';

describe('PlacesService Edge Cases', () => {
  let service: PlacesService;
  let placeRepository: Repository<Place>;

  const mockPlaceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTagRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockModerationLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRecommendationsService = {
    generateEmbedding: jest.fn(),
  };

  beforeEach(async () => {
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
      ],
    }).compile();

    service = module.get<PlacesService>(PlacesService);
    placeRepository = module.get<Repository<Place>>(getRepositoryToken(Place));
  });

  describe('createPlace edge cases', () => {
    it('should handle creation with maximum coordinate values', async () => {
      const createPlaceDto: CreatePlaceDto = {
        name: 'Extreme Coordinates Place',
        description: 'Testing max coordinates',
        coordinates: { longitude: 180, latitude: 90 }, // Max possible values
      };

      const savedPlace = {
        id: '1',
        name: createPlaceDto.name,
        description: createPlaceDto.description,
        coordinates: 'POINT(180 90)',
        tagIds: [],
        status: PlaceStatus.PENDING,
      };

      jest.spyOn(placeRepository, 'save').mockResolvedValue(savedPlace as any);

      const result = await service.createPlace(createPlaceDto);

      expect(result.coordinates).toBe('POINT(180 90)');
    });

    it('should handle creation with minimum coordinate values', async () => {
      const createPlaceDto: CreatePlaceDto = {
        name: 'Min Coordinates Place',
        description: 'Testing min coordinates',
        coordinates: { longitude: -180, latitude: -90 }, // Min possible values
      };

      const savedPlace = {
        id: '1',
        name: createPlaceDto.name,
        description: createPlaceDto.description,
        coordinates: 'POINT(-180 -90)',
        tagIds: [],
        status: PlaceStatus.PENDING,
      };

      jest.spyOn(placeRepository, 'save').mockResolvedValue(savedPlace as any);

      const result = await service.createPlace(createPlaceDto);

      expect(result.coordinates).toBe('POINT(-180 -90)');
    });

    it('should handle creation with many tags', async () => {
      const manyTagIds = Array.from({ length: 10 }, (_, i) => `tag${i}`);
      const createPlaceDto: CreatePlaceDto = {
        name: 'Many Tags Place',
        coordinates: { longitude: 25.75, latitude: 42.35 },
        tagIds: manyTagIds,
      };

      const savedPlace = {
        id: '1',
        name: createPlaceDto.name,
        coordinates: 'POINT(25.75 42.35)',
        tagIds: manyTagIds,
        status: PlaceStatus.PENDING,
      };

      jest.spyOn(placeRepository, 'save').mockResolvedValue(savedPlace as any);

      const result = await service.createPlace(createPlaceDto);

      expect(result.tagIds).toHaveLength(10);
      expect(result.tagIds).toEqual(manyTagIds);
    });
  });

  describe('findPlaces edge cases', () => {
    it('should handle search with empty filters', async () => {
      const filterDto: PlaceFilterDto = {};

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest.spyOn(placeRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findPlaces(filterDto);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should handle search with very large radius', async () => {
      const filterDto: PlaceFilterDto = {
        location: {
          latitude: 42.35,
          longitude: 25.75,
          radius: 1000000, // Very large radius (1000km)
        }
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest.spyOn(placeRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.findPlaces(filterDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ST_DWithin(place.coordinates, ST_Point(:longitude, :latitude)::geography, :radius)',
        { longitude: 25.75, latitude: 42.35, radius: 1000000 }
      );
    });

    it('should handle pagination with max values', async () => {
      const filterDto: PlaceFilterDto = {
        page: 999999,  // Very large page number
        limit: 100,     // Max limit
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest.spyOn(placeRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findPlaces(filterDto);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith((999999 - 1) * 100);
      expect(result.meta.limit).toBe(100);
    });
  });

  describe('updatePlace edge cases', () => {
    it('should handle update for non-existent place', async () => {
      jest.spyOn(placeRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.updatePlace('nonexistent', { name: 'New Name' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle partial updates', async () => {
      const place = {
        id: '1',
        name: 'Old Name',
        description: 'Old description',
        coordinates: 'POINT(25.75 42.35)',
        tagIds: ['tag1'],
        status: PlaceStatus.APPROVED,
      };

      const updateDto: UpdatePlaceDto = {
        name: 'New Name',  // Only update name
      };

      const updatedPlace = {
        ...place,
        name: 'New Name',
      };

      jest.spyOn(placeRepository, 'findOne').mockResolvedValue(place as any);
      jest.spyOn(placeRepository, 'save').mockResolvedValue(updatedPlace as any);

      const result = await service.updatePlace('1', updateDto);

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('Old description'); // Should remain unchanged
    });

    it('should handle update of approved place', async () => {
      const place = {
        id: '1',
        name: 'Approved Place',
        status: PlaceStatus.APPROVED,
      };

      const updateDto: UpdatePlaceDto = {
        name: 'Updated Approved Place',
      };

      const updatedPlace = {
        ...place,
        name: 'Updated Approved Place',
      };

      jest.spyOn(placeRepository, 'findOne').mockResolvedValue(place as any);
      jest.spyOn(placeRepository, 'save').mockResolvedValue(updatedPlace as any);

      const result = await service.updatePlace('1', updateDto);

      expect(result.status).toBe(PlaceStatus.APPROVED); // Should remain approved
    });
  });

  describe('moderation edge cases', () => {
    it('should handle approval of non-existent place', async () => {
      jest.spyOn(placeRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.approvePlace('nonexistent', 'moderator1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle rejection of non-existent place', async () => {
      jest.spyOn(placeRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.rejectPlace('nonexistent', 'moderator1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle approval and rejection with empty reason', async () => {
      const place = {
        id: '1',
        name: 'Test Place',
        status: PlaceStatus.PENDING,
      };

      const approvedPlace = { ...place, status: PlaceStatus.APPROVED };
      const rejectedPlace = { ...place, status: PlaceStatus.REJECTED };

      jest.spyOn(placeRepository, 'findOne').mockResolvedValue(place as any);
      jest.spyOn(placeRepository, 'save').mockResolvedValueOnce(approvedPlace as any).mockResolvedValueOnce(rejectedPlace as any);

      const approvedResult = await service.approvePlace('1', 'moderator1');
      expect(approvedResult.status).toBe(PlaceStatus.APPROVED);

      const rejectedResult = await service.rejectPlace('1', 'moderator1');
      expect(rejectedResult.status).toBe(PlaceStatus.REJECTED);
    });
  });

  describe('access validation edge cases', () => {
    it('should return false for undefined user role', () => {
      const user = { id: '1', role: undefined } as unknown as User;
      expect(service.validateModeratorAccess(user)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(service.validateModeratorAccess(null as any)).toBe(false);
    });

    it('should handle string-based roles correctly', () => {
      // This tests what happens if role is passed as a string instead of enum
      const user = { id: '1', role: UserRole.USER as unknown as string } as User;
      expect(service.validateModeratorAccess(user)).toBe(false);

      const moderatorUser = { id: '1', role: UserRole.MODERATOR as unknown as string } as User;
      expect(service.validateModeratorAccess(moderatorUser)).toBe(true);
    });
  });
});