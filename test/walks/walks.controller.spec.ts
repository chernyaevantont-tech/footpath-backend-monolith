import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalksController } from '../../src/walks/walks.controller';
import { WalksService } from '../../src/walks/walks.service';
import { CreateWalkDto } from '../../src/walks/dto/create-walk.dto';
import { UpdateWalkDto } from '../../src/walks/dto/update-walk.dto';
import { CompleteWalkDto } from '../../src/walks/dto/complete-walk.dto';
import { Walk } from '../../src/walks/entities/walk.entity';
import { WalkParticipant, ParticipantStatus } from '../../src/walks/entities/walk-participant.entity';
import { User } from '../../src/auth/entities/user.entity';
import { Path } from '../../src/paths/entities/path.entity';
import { WalkStatus } from '../../src/walks/entities/walk.entity';

describe('WalksController', () => {
  let controller: WalksController;
  let service: WalksService;

  const mockWalksService = {
    createWalk: jest.fn(),
    getWalks: jest.fn(),
    getWalkById: jest.fn(),
    updateWalk: jest.fn(),
    inviteParticipants: jest.fn(),
    respondToInvitation: jest.fn(),
    completeWalk: jest.fn(),
    deleteWalk: jest.fn(),
    getUserParticipatedWalks: jest.fn(),
    getUserInvitations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalksController],
      providers: [
        {
          provide: WalksService,
          useValue: mockWalksService,
        },
      ],
    }).compile();

    controller = module.get<WalksController>(WalksController);
    service = module.get<WalksService>(WalksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createWalk', () => {
    it('should create a walk', async () => {
      const req = { user: { id: 'user1' } };
      const createWalkDto: CreateWalkDto = {
        title: 'Morning Walk',
        description: 'A peaceful morning walk',
        startTime: '2023-01-01T10:00:00Z',
      };

      const mockWalk = {
        id: 'walk1',
        title: createWalkDto.title,
        description: createWalkDto.description,
        pathId: createWalkDto.pathId,
        startTime: createWalkDto.startTime ? new Date(createWalkDto.startTime) : null,
        endTime: createWalkDto.endTime ? new Date(createWalkDto.endTime) : null,
        status: createWalkDto.status,
        creatorId: 'creator1',
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [],
        path: null,
        creator: null
      } as Walk;

      jest.spyOn(service, 'createWalk').mockResolvedValue(mockWalk);

      const result = await controller.createWalk(req, createWalkDto);

      expect(service.createWalk).toHaveBeenCalledWith(req.user.id, createWalkDto);
      expect(result).toEqual(mockWalk);
    });
  });

  describe('getWalks', () => {
    it('should return walks for a user', async () => {
      const req = { user: { id: 'user1' } };
      const query = { status: WalkStatus.PLANNED };

      const mockResponse = {
        data: [{
          id: 'walk1',
          title: 'Morning Walk',
          description: null,
          pathId: null,
          startTime: null,
          endTime: null,
          status: WalkStatus.PLANNED,
          creatorId: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [],
          path: null,
          creator: null
        } as Walk],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      jest.spyOn(service, 'getWalks').mockResolvedValue(mockResponse);

      const result = await controller.getWalks(req, query);

      expect(service.getWalks).toHaveBeenCalledWith(req.user.id, query);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getWalk', () => {
    it('should return a specific walk', async () => {
      const req = { user: { id: 'user1' } };
      const walkId = 'walk1';

      const mockWalk = { id: walkId, title: 'Morning Walk' } as Walk;

      jest.spyOn(service, 'getWalkById').mockResolvedValue(mockWalk);

      const result = await controller.getWalk(req, walkId);

      expect(service.getWalkById).toHaveBeenCalledWith(walkId, req.user.id);
      expect(result).toEqual(mockWalk);
    });
  });

  describe('updateWalk', () => {
    it('should update a walk', async () => {
      const req = { user: { id: 'user1' } };
      const walkId = 'walk1';
      const updateWalkDto: UpdateWalkDto = { title: 'Updated Title' };

      const mockWalk = { id: walkId, title: 'Updated Title' } as Walk;

      jest.spyOn(service, 'updateWalk').mockResolvedValue(mockWalk);

      const result = await controller.updateWalk(req, walkId, updateWalkDto);

      expect(service.updateWalk).toHaveBeenCalledWith(walkId, req.user.id, updateWalkDto);
      expect(result).toEqual(mockWalk);
    });
  });

  describe('inviteParticipants', () => {
    it('should invite participants to a walk', async () => {
      const req = { user: { id: 'user1' } };
      const walkId = 'walk1';
      const inviteDto = { userIds: ['user2', 'user3'] };

      const mockParticipants = [
        { id: 'part1', userId: 'user2', status: ParticipantStatus.PENDING },
        { id: 'part2', userId: 'user3', status: ParticipantStatus.PENDING },
      ] as WalkParticipant[];

      jest.spyOn(service, 'inviteParticipants').mockResolvedValue(mockParticipants);

      const result = await controller.inviteParticipants(req, walkId, inviteDto);

      expect(service.inviteParticipants).toHaveBeenCalledWith(req.user.id, walkId, inviteDto.userIds);
      expect(result).toEqual(mockParticipants);
    });
  });

  describe('respondToInvitation', () => {
    it('should allow user to respond to invitation', async () => {
      const req = { user: { id: 'user2' } };
      const walkId = 'walk1';
      const respondDto = { status: ParticipantStatus.CONFIRMED };

      const mockParticipant = { id: 'part1', userId: 'user2', status: ParticipantStatus.CONFIRMED } as WalkParticipant;

      jest.spyOn(service, 'respondToInvitation').mockResolvedValue(mockParticipant);

      const result = await controller.respondToInvitation(req, walkId, respondDto);

      expect(service.respondToInvitation).toHaveBeenCalledWith(req.user.id, walkId, respondDto.status);
      expect(result).toEqual(mockParticipant);
    });
  });

  describe('completeWalk', () => {
    it('should complete a walk', async () => {
      const req = { user: { id: 'user1' } };
      const walkId = 'walk1';
      const completeWalkDto: CompleteWalkDto = {};

      const mockWalk = { id: walkId, status: WalkStatus.COMPLETED } as Walk;

      jest.spyOn(service, 'completeWalk').mockResolvedValue(mockWalk);

      const result = await controller.completeWalk(req, walkId, completeWalkDto);

      expect(service.completeWalk).toHaveBeenCalledWith(req.user.id, walkId, completeWalkDto);
      expect(result).toEqual(mockWalk);
    });
  });

  describe('deleteWalk', () => {
    it('should delete a walk', async () => {
      const req = { user: { id: 'user1' } };
      const walkId = 'walk1';

      const mockResult = { message: 'Walk deleted successfully', id: walkId };

      jest.spyOn(service, 'deleteWalk').mockResolvedValue(mockResult);

      const result = await controller.deleteWalk(req, walkId);

      expect(service.deleteWalk).toHaveBeenCalledWith(walkId, req.user.id);
      expect(result).toEqual(mockResult);
    });
  });
});