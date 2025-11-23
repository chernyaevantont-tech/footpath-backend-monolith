import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WalksService } from '../../src/walks/walks.service';
import { Walk } from '../../src/walks/entities/walk.entity';
import { WalkParticipant, ParticipantStatus } from '../../src/walks/entities/walk-participant.entity';
import { User } from '../../src/auth/entities/user.entity';
import { Path } from '../../src/paths/entities/path.entity';
import { CreateWalkDto } from '../../src/walks/dto/create-walk.dto';
import { UpdateWalkDto } from '../../src/walks/dto/update-walk.dto';
import { WalkStatus } from '../../src/walks/entities/walk.entity';

describe('WalksService Edge Cases', () => {
  let service: WalksService;
  let walkRepository: Repository<Walk>;
  let walkParticipantRepository: Repository<WalkParticipant>;
  let userRepository: Repository<User>;

  const mockWalkRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockWalkParticipantRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIds: jest.fn(),
  };

  const mockPathRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalksService,
        { provide: getRepositoryToken(Walk), useValue: mockWalkRepository },
        { provide: getRepositoryToken(WalkParticipant), useValue: mockWalkParticipantRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Path), useValue: mockPathRepository },
      ],
    }).compile();

    service = module.get<WalksService>(WalksService);
    walkRepository = module.get<Repository<Walk>>(getRepositoryToken(Walk));
    walkParticipantRepository = module.get<Repository<WalkParticipant>>(getRepositoryToken(WalkParticipant));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('createWalk edge cases', () => {
    it('should handle creation with maximum allowed participants', async () => {
      const creatorId = 'user1';
      const createWalkDto: CreateWalkDto = {
        title: 'Large Group Walk',
        description: 'Walk with maximum participants',
        inviteeIds: Array.from({ length: 50 }, (_, i) => `user${i + 2}`), // 50 invitees + creator = 51 total
      };

      const mockUsers = createWalkDto.inviteeIds.map((id, idx) => ({
        id,
        email: `user${idx + 2}@example.com`,
      })) as User[];

      const mockWalk = {
        id: 'walk1',
        title: createWalkDto.title,
        description: createWalkDto.description,
        creatorId,
        status: WalkStatus.PLANNED,
      } as Walk;

      const mockCreatorParticipant = {
        id: 'part1',
        walkId: 'walk1',
        userId: creatorId,
        status: ParticipantStatus.CONFIRMED,
      } as WalkParticipant;

      const mockInviteParticipants = mockUsers.map((user, idx) => ({
        id: `inv${idx}`,
        walkId: 'walk1',
        userId: user.id,
        status: ParticipantStatus.PENDING,
      } as WalkParticipant));

      jest.spyOn(userRepository, 'findByIds').mockResolvedValue(mockUsers);
      jest.spyOn(walkRepository, 'save').mockResolvedValue(mockWalk);
      jest.spyOn(walkParticipantRepository, 'save')
        .mockResolvedValueOnce(mockCreatorParticipant as any) // First call for creator
        .mockResolvedValue(mockInviteParticipants as any); // Subsequent calls for invitees (using save many)

      const result = await service.createWalk(creatorId, createWalkDto);

      expect(result).toEqual(mockWalk);
      expect(userRepository.findByIds).toHaveBeenCalledWith(createWalkDto.inviteeIds);
    });

    it('should handle creation with invalid path ID', async () => {
      const creatorId = 'user1';
      const createWalkDto: CreateWalkDto = {
        title: 'Invalid Path Walk',
        pathId: 'nonexistent-path',
      };

      jest.spyOn(mockPathRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createWalk(creatorId, createWalkDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle creation with missing required fields', async () => {
      const creatorId = 'user1';
      const createWalkDto = {} as CreateWalkDto; // Missing required title

      const mockWalk = {
        id: 'walk1',
        title: undefined,
        creatorId,
        status: WalkStatus.PLANNED,
      } as Walk;

      // We can still create a walk without title if validation is handled elsewhere
      jest.spyOn(walkRepository, 'save').mockResolvedValue(mockWalk);

      await expect(service.createWalk(creatorId, createWalkDto)).rejects.toThrow();
    });
  });

  describe('getWalks edge cases', () => {
    it('should handle pagination with large page numbers', async () => {
      const userId = 'user1';
      const mockWalks = Array.from({ length: 5 }, (_, i) => ({
        id: `walk${i + 1}`,
        title: `Walk ${i + 1}`,
        creatorId: userId,
      })) as Walk[];

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockWalks, mockWalks.length]),
      };

      jest.spyOn(walkRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getWalks(userId, { page: 999999, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith((999999 - 1) * 10);
      expect(result.meta.page).toBe(999999);
      expect(result.meta.limit).toBe(10);
    });

    it('should handle filtering with non-existent status', async () => {
      const userId = 'user1';
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest.spyOn(walkRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getWalks(userId, { status: 'nonexistent-status' as WalkStatus });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'walk.status = :status',
        { status: 'nonexistent-status' }
      );
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should handle date range filtering', async () => {
      const userId = 'user1';
      const dateParams = { startDate: '2023-01-01', endDate: '2023-12-31' };
      const mockWalks = [] as Walk[];

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockWalks, 0]),
      };

      jest.spyOn(walkRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getWalks(userId, dateParams);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'walk.startTime >= :startDate',
        { startDate: new Date(dateParams.startDate) }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'walk.endTime <= :endDate',
        { endDate: new Date(dateParams.endDate) }
      );
      expect(result.data).toEqual([]);
    });
  });

  describe('getWalkById edge cases', () => {
    it('should handle very long walk ID', async () => {
      const veryLongId = 'x'.repeat(100);
      const userId = 'user1';

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getWalkById(veryLongId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should handle special characters in walk ID', async () => {
      const specialId = 'walk-with-special-chars_123';
      const userId = 'user1';

      const mockWalk = {
        id: specialId,
        title: 'Special Walk',
        creatorId: userId,
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);

      const result = await service.getWalkById(specialId, userId);

      expect(result.id).toBe(specialId);
    });

    it('should handle access by non-participant nor creator', async () => {
      const walkId = 'walk1';
      const userId = 'user3'; // Not the creator or participant
      const mockWalk = {
        id: walkId,
        title: 'Private Walk',
        creatorId: 'user1',
        participants: [{ userId: 'user2' }], // Only user2 is participant
      } as any;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);

      await expect(service.getWalkById(walkId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateWalk edge cases', () => {
    it('should not allow update after walk status has changed from PLANNED', async () => {
      const walkId = 'walk1';
      const userId = 'user1';
      const updateDto: UpdateWalkDto = { title: 'Updated Title' };

      const ongoingWalk = {
        id: walkId,
        title: 'Original Title',
        creatorId: userId,
        status: WalkStatus.ONGOING, // Not PLANNED anymore
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(ongoingWalk);

      await expect(service.updateWalk(walkId, userId, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle update with invalid path ID', async () => {
      const walkId = 'walk1';
      const userId = 'user1';
      const updateDto: UpdateWalkDto = { pathId: 'invalid-path' };

      const plannedWalk = {
        id: walkId,
        title: 'Original Title',
        creatorId: userId,
        status: WalkStatus.PLANNED,
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(plannedWalk);
      jest.spyOn(mockPathRepository, 'findOne').mockResolvedValue(null); // Path not found

      await expect(service.updateWalk(walkId, userId, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should allow update with valid but different path ID', async () => {
      const walkId = 'walk1';
      const userId = 'user1';
      const updateDto: UpdateWalkDto = { pathId: 'different-path' };

      const plannedWalk = {
        id: walkId,
        title: 'Original Title',
        creatorId: userId,
        status: WalkStatus.PLANNED,
      } as Walk;

      const newPath = { id: 'different-path', name: 'Different Path' } as Path;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(plannedWalk);
      jest.spyOn(mockPathRepository, 'findOne').mockResolvedValue(newPath);
      jest.spyOn(walkRepository, 'save').mockResolvedValue({ ...plannedWalk, pathId: 'different-path' });

      const result = await service.updateWalk(walkId, userId, updateDto);

      expect(result.pathId).toBe('different-path');
    });
  });

  describe('inviteParticipants edge cases', () => {
    it('should reject inviting non-existent users', async () => {
      const creatorId = 'user1';
      const walkId = 'walk1';
      const userIds = ['nonexistent-user1', 'nonexistent-user2'];

      const mockWalk = { id: walkId, creatorId } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);
      jest.spyOn(userRepository, 'findByIds').mockResolvedValue([]); // No users found

      await expect(service.inviteParticipants(creatorId, walkId, userIds)).rejects.toThrow(BadRequestException);
    });

    it('should reject inviting already participating users', async () => {
      const creatorId = 'user1';
      const walkId = 'walk1';
      const userIds = ['user2'];

      const mockWalk = { id: walkId, creatorId } as Walk;
      const existingParticipant = { id: 'part1', userId: 'user2', walkId, status: ParticipantStatus.CONFIRMED } as WalkParticipant;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);
      jest.spyOn(userRepository, 'findByIds').mockResolvedValue([{ id: 'user2' } as User]);
      jest.spyOn(walkParticipantRepository, 'find').mockResolvedValue([existingParticipant]);

      await expect(service.inviteParticipants(creatorId, walkId, userIds)).rejects.toThrow(BadRequestException);
    });

    it('should handle invite when user is not the creator', async () => {
      const creatorId = 'user3'; // Different from actual creator
      const walkId = 'walk1';
      const userIds = ['user4'];

      const mockWalk = { id: walkId, creatorId: 'user1' } as Walk; // Actual creator is user1

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);

      await expect(service.inviteParticipants(creatorId, walkId, userIds)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('respondToInvitation edge cases', () => {
    it('should reject invalid status responses', async () => {
      const userId = 'user2';
      const walkId = 'walk1';
      const invalidStatus = 'invalid-status' as ParticipantStatus;

      const mockParticipant = {
        id: 'part1',
        userId,
        walkId,
        status: ParticipantStatus.PENDING,
      } as WalkParticipant;

      jest.spyOn(walkParticipantRepository, 'findOne').mockResolvedValue(mockParticipant);

      await expect(service.respondToInvitation(userId, walkId, invalidStatus)).rejects.toThrow(BadRequestException);
    });

    it('should handle responding to non-existent invitation', async () => {
      jest.spyOn(walkParticipantRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.respondToInvitation('user2', 'walk1', ParticipantStatus.CONFIRMED)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle duplicate responses', async () => {
      const userId = 'user2';
      const walkId = 'walk1';

      const mockParticipant = {
        id: 'part1',
        userId,
        walkId,
        status: ParticipantStatus.CONFIRMED, // Already confirmed
      } as WalkParticipant;

      jest.spyOn(walkParticipantRepository, 'findOne').mockResolvedValue(mockParticipant);
      jest.spyOn(walkParticipantRepository, 'save').mockResolvedValue({
        ...mockParticipant,
        status: ParticipantStatus.CONFIRMED,
      });

      // Should be able to respond again (might be updating other details)
      const result = await service.respondToInvitation(userId, walkId, ParticipantStatus.CONFIRMED);

      expect(result.status).toBe(ParticipantStatus.CONFIRMED);
    });
  });

  describe('completeWalk edge cases', () => {
    it('should not allow non-creator to complete walk', async () => {
      const userId = 'user2'; // Not the creator
      const walkId = 'walk1';

      const mockWalk = {
        id: walkId,
        title: 'Walk to Complete',
        creatorId: 'user1', // Actual creator is user1
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);

      await expect(service.completeWalk(userId, walkId)).rejects.toThrow(ForbiddenException);
    });

    it('should handle completing already completed walk', async () => {
      const userId = 'user1';
      const walkId = 'walk1';

      const completedWalk = {
        id: walkId,
        title: 'Already Completed Walk',
        creatorId: userId,
        status: WalkStatus.COMPLETED,
      } as Walk;

      const updatedWalk = { ...completedWalk, endTime: new Date() } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(completedWalk);
      jest.spyOn(walkRepository, 'save').mockResolvedValue(updatedWalk);
      jest.spyOn(walkParticipantRepository, 'update').mockResolvedValue({} as any);

      const result = await service.completeWalk(userId, walkId);

      expect(result.status).toBe(WalkStatus.COMPLETED);
    });
  });

  describe('deleteWalk edge cases', () => {
    it('should reject deletion by non-creator', async () => {
      const walkId = 'walk1';
      const userId = 'user2'; // Not the creator

      const mockWalk = {
        id: walkId,
        title: 'Protected Walk',
        creatorId: 'user1', // Actual creator is user1
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);

      await expect(service.deleteWalk(walkId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should reject deletion of ongoing walk', async () => {
      const walkId = 'walk1';
      const userId = 'user1'; // Creator

      const mockWalk = {
        id: walkId,
        title: 'Ongoing Walk',
        creatorId: userId,
        status: WalkStatus.ONGOING, // Status prevents deletion
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);

      await expect(service.deleteWalk(walkId, userId)).rejects.toThrow(BadRequestException);
    });

    it('should handle deletion of valid walk', async () => {
      const walkId = 'walk1';
      const userId = 'user1'; // Creator

      const mockWalk = {
        id: walkId,
        title: 'Deletable Walk',
        creatorId: userId,
        status: WalkStatus.PLANNED, // Only planned walks can be deleted
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);
      jest.spyOn(walkRepository, 'remove').mockResolvedValue(mockWalk);

      const result = await service.deleteWalk(walkId, userId);

      expect(result.message).toBe('Walk deleted successfully');
    });
  });

  describe('security validation edge cases', () => {
    it('should prevent unauthorized access to other users\' walks', async () => {
      const walkId = 'walk1';
      const userId = 'user3'; // Not the creator or participant

      const mockWalk = {
        id: walkId,
        title: 'Private Walk',
        creatorId: 'user1',
        participants: [{ userId: 'user2' }],
      } as any;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);

      await expect(service.getWalkById(walkId, userId)).rejects.toThrow(ForbiddenException);
    });
  });
});