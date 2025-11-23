import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

describe('PlacesService', () => {
  let service: PlacesService;
  let placeRepository: Repository<Place>;
  let tagRepository: Repository<Tag>;
  let moderationLogRepository: Repository<PlaceModerationLog>;

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
      ],
    }).compile();

    service = module.get<PlacesService>(PlacesService);
    placeRepository = module.get<Repository<Place>>(getRepositoryToken(Place));
    tagRepository = module.get<Repository<Tag>>(getRepositoryToken(Tag));
    moderationLogRepository = module.get<Repository<PlaceModerationLog>>(getRepositoryToken(PlaceModerationLog));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlace', () => {
    it('should create a new place successfully', async () => {
      const createPlaceDto: CreatePlaceDto = {
        name: 'Test Place',
        description: 'A test place',
        coordinates: { longitude: 25.75, latitude: 42.35 },
        tagIds: ['tag1', 'tag2'],
      };

      const savedPlace = {
        id: '1',
        name: createPlaceDto.name,
        description: createPlaceDto.description,
        coordinates: 'POINT(25.75 42.35)',
        tagIds: createPlaceDto.tagIds,
        status: PlaceStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(placeRepository, 'save').mockResolvedValue(savedPlace as any);

      const result = await service.createPlace(createPlaceDto);

      expect(placeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createPlaceDto.name,
          description: createPlaceDto.description,
          coordinates: 'POINT(25.75 42.35)',
          tagIds: createPlaceDto.tagIds,
          status: PlaceStatus.PENDING,
        })
      );
      expect(result).toEqual(savedPlace);
    });
  });

  describe('findPlaces', () => {
    it('should find places with filters', async () => {
      const filterDto: PlaceFilterDto = {
        name: 'Test',
        status: PlaceStatus.APPROVED,
        tagIds: ['tag1'],
        page: 1,
        limit: 10,
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

      expect(placeRepository.createQueryBuilder).toHaveBeenCalledWith('place');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3); // name, status and tagIds filters
    });

    it('should find places with location filter', async () => {
      const filterDto: PlaceFilterDto = {
        location: {
          latitude: 42.35,
          longitude: 25.75,
          radius: 1000,
        },
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

      expect(placeRepository.createQueryBuilder).toHaveBeenCalledWith('place');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ST_DWithin(place.coordinates, ST_Point(:longitude, :latitude)::geography, :radius)',
        { longitude: 25.75, latitude: 42.35, radius: 1000 }
      );
    });
  });

  describe('getPlaceById', () => {
    it('should return a place when it exists', async () => {
      const place = {
        id: '1',
        name: 'Test Place',
        description: 'A test place',
        coordinates: 'POINT(25.75 42.35)',
        tagIds: [],
        status: PlaceStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(placeRepository, 'findOne').mockResolvedValue(place as any);

      const result = await service.getPlaceById('1');

      expect(placeRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(place);
    });

    it('should throw NotFoundException when place does not exist', async () => {
      jest.spyOn(placeRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPlaceById('1')).rejects.toThrow('Place with ID 1 not found');
    });
  });

  describe('updatePlace', () => {
    it('should update a place successfully', async () => {
      const place = {
        id: '1',
        name: 'Old Name',
        description: 'Old description',
        coordinates: 'POINT(24.75 41.35)',
        tagIds: [],
        status: PlaceStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto: UpdatePlaceDto = {
        name: 'New Name',
        coordinates: { longitude: 25.75, latitude: 42.35 },
      };

      const updatedPlace = {
        ...place,
        name: updateDto.name,
        coordinates: 'POINT(25.75 42.35)',
      };

      jest.spyOn(placeRepository, 'findOne').mockResolvedValue(place as any);
      jest.spyOn(placeRepository, 'save').mockResolvedValue(updatedPlace as any);

      const result = await service.updatePlace('1', updateDto);

      expect(placeRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(placeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
          coordinates: 'POINT(25.75 42.35)',
        })
      );
      expect(result).toEqual(updatedPlace);
    });
  });

  describe('approvePlace', () => {
    it('should approve a place', async () => {
      const place = {
        id: '1',
        name: 'Test Place',
        status: PlaceStatus.PENDING,
      };

      const approvedPlace = { ...place, status: PlaceStatus.APPROVED, moderatorId: 'moderator1' };

      jest.spyOn(placeRepository, 'findOne').mockResolvedValue(place as any);
      jest.spyOn(placeRepository, 'save').mockResolvedValue(approvedPlace as any);

      const result = await service.approvePlace('1', 'moderator1', 'Looks good');

      expect(placeRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(placeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          status: PlaceStatus.APPROVED,
          moderatorId: 'moderator1',
        })
      );
      expect(result).toEqual(approvedPlace);
    });
  });

  describe('rejectPlace', () => {
    it('should reject a place', async () => {
      const place = {
        id: '1',
        name: 'Test Place',
        status: PlaceStatus.PENDING,
      };

      const rejectedPlace = { ...place, status: PlaceStatus.REJECTED, moderatorId: 'moderator1' };

      jest.spyOn(placeRepository, 'findOne').mockResolvedValue(place as any);
      jest.spyOn(placeRepository, 'save').mockResolvedValue(rejectedPlace as any);

      const result = await service.rejectPlace('1', 'moderator1', 'Not appropriate');

      expect(placeRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(placeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          status: PlaceStatus.REJECTED,
          moderatorId: 'moderator1',
        })
      );
      expect(result).toEqual(rejectedPlace);
    });
  });

  describe('validateModeratorAccess', () => {
    it('should return true for moderator user', () => {
      const user = { id: '1', role: UserRole.MODERATOR } as User;
      expect(service.validateModeratorAccess(user)).toBe(true);
    });

    it('should return true for admin user', () => {
      const user = { id: '1', role: UserRole.ADMIN } as User;
      expect(service.validateModeratorAccess(user)).toBe(true);
    });

    it('should return false for regular user', () => {
      const user = { id: '1', role: UserRole.USER } as User;
      expect(service.validateModeratorAccess(user)).toBe(false);
    });
  });
});