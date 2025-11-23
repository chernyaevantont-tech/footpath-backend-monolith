import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlacesController } from '../../src/places/places.controller';
import { PlacesService } from '../../src/places/places.service';
import { Place } from '../../src/places/entities/place.entity';
import { CreatePlaceDto } from '../../src/places/dto/create-place.dto';
import { UpdatePlaceDto } from '../../src/places/dto/update-place.dto';
import { PlaceFilterDto } from '../../src/places/dto/place-filter.dto';
import { ApprovePlaceDto } from '../../src/places/dto/approve-place.dto';
import { PlaceStatus } from '../../src/places/entities/place.entity';
import { ModerationAction } from '../../src/places/entities/place-moderation-log.entity';
import { User, UserRole } from '../../src/auth/entities/user.entity';
import { RedisService } from '../../src/common/redis.service';

describe('PlacesController', () => {
  let controller: PlacesController;
  let service: PlacesService;

  const mockPlacesService = {
    createPlace: jest.fn(),
    findPlaces: jest.fn(),
    getPlaceById: jest.fn(),
    updatePlace: jest.fn(),
    approvePlace: jest.fn(),
    rejectPlace: jest.fn(),
    validateModeratorAccess: jest.fn(),
  };

  const mockRedisService = {
    getJson: jest.fn().mockResolvedValue(null), // Initially return null for cache misses
    setJson: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    exists: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacesController],
      providers: [
        {
          provide: PlacesService,
          useValue: mockPlacesService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    controller = module.get<PlacesController>(PlacesController);
    service = module.get<PlacesService>(PlacesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPlace', () => {
    it('should create a place', async () => {
      const createPlaceDto: CreatePlaceDto = {
        name: 'Test Place',
        description: 'A test place',
        coordinates: { longitude: 25.75, latitude: 42.35 },
      };

      const mockPlace = {
        id: '1',
        name: createPlaceDto.name,
        description: createPlaceDto.description,
        coordinates: 'POINT(25.75 42.35)',
        status: PlaceStatus.PENDING,
      };

      jest.spyOn(service, 'createPlace').mockResolvedValue(mockPlace as any);

      const result = await controller.createPlace(createPlaceDto);

      expect(service.createPlace).toHaveBeenCalledWith(createPlaceDto);
      expect(result).toEqual(mockPlace);
    });
  });

  describe('findPlaces', () => {
    it('should find places with filters', async () => {
      const filterDto: PlaceFilterDto = {
        name: 'Test',
        status: PlaceStatus.APPROVED,
      };

      const mockResult = {
        data: [],
        meta: { page: 1, limit: 10, total: 0, pages: 0 },
      };

      jest.spyOn(service, 'findPlaces').mockResolvedValue(mockResult as any);

      const result = await controller.findPlaces(filterDto);

      expect(service.findPlaces).toHaveBeenCalledWith(filterDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getPlace', () => {
    it('should get a place by ID', async () => {
      const mockPlace = {
        id: '1',
        name: 'Test Place',
        status: PlaceStatus.APPROVED,
      };

      jest.spyOn(service, 'getPlaceById').mockResolvedValue(mockPlace as any);

      const result = await controller.getPlace('1');

      expect(service.getPlaceById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockPlace);
    });
  });

  describe('updatePlace', () => {
    it('should update a place', async () => {
      const updateDto: UpdatePlaceDto = {
        name: 'Updated Name',
      };

      const mockPlace = {
        id: '1',
        name: 'Updated Name',
        status: PlaceStatus.PENDING,
      };

      jest.spyOn(service, 'updatePlace').mockResolvedValue(mockPlace as any);

      const result = await controller.updatePlace('1', updateDto);

      expect(service.updatePlace).toHaveBeenCalledWith('1', updateDto);
      expect(result).toEqual(mockPlace);
    });
  });

  describe('approvePlace', () => {
    it('should approve a place when user is moderator', async () => {
      const req = {
        user: { id: 'moderator1', role: UserRole.MODERATOR },
      };

      const approveDto: ApprovePlaceDto = { reason: 'Looks good' };
      const mockPlace = { id: '1', status: PlaceStatus.APPROVED };

      jest.spyOn(service, 'validateModeratorAccess').mockReturnValue(true);
      jest.spyOn(service, 'approvePlace').mockResolvedValue(mockPlace as any);

      const result = await controller.approvePlace('1', approveDto, req);

      expect(service.validateModeratorAccess).toHaveBeenCalledWith(req.user);
      expect(service.approvePlace).toHaveBeenCalledWith('1', 'moderator1', 'Looks good');
      expect(result).toEqual(mockPlace);
    });

    it('should throw UnauthorizedException when user is not a moderator', async () => {
      const req = {
        user: { id: 'user1', role: UserRole.USER },
      };

      const approveDto: ApprovePlaceDto = { reason: 'Looks good' };

      jest.spyOn(service, 'validateModeratorAccess').mockReturnValue(false);

      await expect(controller.approvePlace('1', approveDto, req)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('rejectPlace', () => {
    it('should reject a place when user is moderator', async () => {
      const req = {
        user: { id: 'moderator1', role: UserRole.MODERATOR },
      };

      const approveDto: ApprovePlaceDto = { reason: 'Not appropriate' };
      const mockPlace = { id: '1', status: PlaceStatus.REJECTED };

      jest.spyOn(service, 'validateModeratorAccess').mockReturnValue(true);
      jest.spyOn(service, 'rejectPlace').mockResolvedValue(mockPlace as any);

      const result = await controller.rejectPlace('1', approveDto, req);

      expect(service.validateModeratorAccess).toHaveBeenCalledWith(req.user);
      expect(service.rejectPlace).toHaveBeenCalledWith('1', 'moderator1', 'Not appropriate');
      expect(result).toEqual(mockPlace);
    });

    it('should throw UnauthorizedException when user is not a moderator', async () => {
      const req = {
        user: { id: 'user1', role: UserRole.USER },
      };

      const approveDto: ApprovePlaceDto = { reason: 'Not appropriate' };

      jest.spyOn(service, 'validateModeratorAccess').mockReturnValue(false);

      await expect(controller.rejectPlace('1', approveDto, req)).rejects.toThrow(UnauthorizedException);
    });
  });
});