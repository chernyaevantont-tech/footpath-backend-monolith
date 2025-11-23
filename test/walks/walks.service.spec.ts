import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { WalksService } from '../../src/walks/walks.service';
import { Walk } from '../../src/walks/entities/walk.entity';
import { WalkParticipant, ParticipantStatus } from '../../src/walks/entities/walk-participant.entity';
import { User } from '../../src/auth/entities/user.entity';
import { Path } from '../../src/paths/entities/path.entity';
import { CreateWalkDto } from '../../src/walks/dto/create-walk.dto';
import { UpdateWalkDto } from '../../src/walks/dto/update-walk.dto';
import { CompleteWalkDto } from '../../src/walks/dto/complete-walk.dto';
import { WalkStatus } from '../../src/walks/entities/walk.entity';

describe('WalksService', () => {
  let service: WalksService;
  let walkRepository: Repository<Walk>;
  let walkParticipantRepository: Repository<WalkParticipant>;
  let userRepository: Repository<User>;
  let pathRepository: Repository<Path>;

  const mockWalkRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByIds: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockWalkParticipantRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    findByIds: jest.fn(),
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
        {
          provide: getRepositoryToken(Walk),
          useValue: mockWalkRepository,
        },
        {
          provide: getRepositoryToken(WalkParticipant),
          useValue: mockWalkParticipantRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Path),
          useValue: mockPathRepository,
        },
      ],
    }).compile();

    service = module.get<WalksService>(WalksService);
    walkRepository = module.get<Repository<Walk>>(getRepositoryToken(Walk));
    walkParticipantRepository = module.get<Repository<WalkParticipant>>(getRepositoryToken(WalkParticipant));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    pathRepository = module.get<Repository<Path>>(getRepositoryToken(Path));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWalk', () => {
    it('should create a walk successfully', async () => {
      const creatorId = 'user1';
      const createWalkDto: CreateWalkDto = {
        title: 'Morning Walk',
        description: 'A peaceful morning walk in the park',
        startTime: '2023-01-01T10:00:00Z',
      };

      const mockPath = { id: 'path1' } as Path;
      const mockWalk = {
        id: 'walk1',
        ...createWalkDto,
        status: WalkStatus.PLANNED,
        creatorId,
        startTime: new Date(createWalkDto.startTime),
        endTime: null,
        pathId: null,
      } as Walk;

      const mockParticipant = {
        id: 'participant1',
        walkId: 'walk1',
        userId: creatorId,
        status: ParticipantStatus.CONFIRMED,
        createdAt: new Date(),
        joinedAt: new Date(),
        respondedAt: new Date(),
      } as WalkParticipant;

      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(null); // No path provided, so no validation needed
      jest.spyOn(walkRepository, 'save').mockResolvedValue(mockWalk);
      jest.spyOn(walkParticipantRepository, 'save').mockResolvedValue(mockParticipant);

      const result = await service.createWalk(creatorId, createWalkDto);

      expect(result).toEqual(mockWalk);
      expect(walkRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if path does not exist', async () => {
      const creatorId = 'user1';
      const createWalkDto: CreateWalkDto = {
        title: 'Morning Walk',
        pathId: 'nonexistent-path',
      };

      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createWalk(creatorId, createWalkDto)).rejects.toThrow(BadRequestException);
    });

    it('should invite participants when inviteeIds are provided', async () => {
      const creatorId = 'user1';
      const createWalkDto: CreateWalkDto = {
        title: 'Group Walk',
        description: 'Group walk to the beach',
        startTime: '2023-01-01T10:00:00Z',
        inviteeIds: ['user2', 'user3'],
      };

      const mockWalk = {
        id: 'walk1',
        title: createWalkDto.title,
        description: createWalkDto.description,
        startTime: new Date(createWalkDto.startTime),
        status: WalkStatus.PLANNED,
        creatorId,
      } as Walk;

      const mockParticipant = {
        id: 'participant1',
        walkId: 'walk1',
        userId: creatorId,
        status: ParticipantStatus.CONFIRMED,
        createdAt: new Date(),
        joinedAt: new Date(),
        respondedAt: new Date(),
      } as WalkParticipant;

      jest.spyOn(pathRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(walkRepository, 'save').mockResolvedValue(mockWalk);
      jest.spyOn(walkParticipantRepository, 'save').mockResolvedValue(mockParticipant);
      jest.spyOn(userRepository, 'findByIds').mockResolvedValue([{ id: 'user2' }, { id: 'user3' }] as User[]);
      jest.spyOn(walkParticipantRepository, 'find').mockResolvedValue([]);

      const result = await service.createWalk(creatorId, createWalkDto);

      expect(result).toEqual(mockWalk);
    });
  });

  describe('getWalks', () => {
    it('should return walks for a user', async () => {
      const userId = 'user1';
      const mockWalks = [
        {
          id: 'walk1',
          title: 'Morning Walk',
          creatorId: userId,
          status: WalkStatus.PLANNED,
        } as Walk,
      ];

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockWalks, 1]),
      };

      jest.spyOn(walkRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getWalks(userId);

      expect(result.data).toEqual(mockWalks);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getWalkById', () => {
    it('should return a walk if user is participant or creator', async () => {
      const walkId = 'walk1';
      const userId = 'user1';
      const mockWalk = {
        id: walkId,
        title: 'Morning Walk',
        creatorId: userId,
        participants: [{ userId: 'user1' }],
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);

      const result = await service.getWalkById(walkId, userId);

      expect(result).toEqual(mockWalk);
    });

    it('should throw ForbiddenException if user is not participant or creator', async () => {
      const walkId = 'walk1';
      const userId = 'user3';
      const mockWalk = {
        id: walkId,
        title: 'Morning Walk',
        creatorId: 'user1',
        participants: [{ userId: 'user2' }],
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);

      await expect(service.getWalkById(walkId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateWalk', () => {
    it('should update a walk successfully', async () => {
      const walkId = 'walk1';
      const userId = 'user1';
      const updateWalkDto: UpdateWalkDto = {
        title: 'Updated Morning Walk',
        description: 'Updated description',
      };

      const existingWalk = {
        id: walkId,
        title: 'Morning Walk',
        creatorId: userId,
        status: WalkStatus.PLANNED,
      } as Walk;

      const updatedWalk = {
        ...existingWalk,
        title: updateWalkDto.title,
        description: updateWalkDto.description,
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(existingWalk);
      jest.spyOn(walkRepository, 'save').mockResolvedValue(updatedWalk);

      const result = await service.updateWalk(walkId, userId, updateWalkDto);

      expect(result).toEqual(updatedWalk);
      expect(walkRepository.save).toHaveBeenCalledWith(updatedWalk);
    });

    it('should throw NotFoundException if walk not found', async () => {
      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateWalk('walk1', 'user1', {} as UpdateWalkDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if walk has already started', async () => {
      const existingWalk = {
        id: 'walk1',
        title: 'Morning Walk',
        creatorId: 'user1',
        status: WalkStatus.ONGOING, // Started walks cannot be updated
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(existingWalk);

      await expect(service.updateWalk('walk1', 'user1', {} as UpdateWalkDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('respondToInvitation', () => {
    it('should allow a user to respond to a walk invitation', async () => {
      const userId = 'user2';
      const walkId = 'walk1';
      const status = ParticipantStatus.CONFIRMED;

      const mockParticipant = {
        id: 'participant1',
        userId,
        walkId,
        status: ParticipantStatus.PENDING,
      } as WalkParticipant;

      const updatedParticipant = {
        ...mockParticipant,
        status,
        respondedAt: new Date(),
        joinedAt: new Date(),
      } as WalkParticipant;

      jest.spyOn(walkParticipantRepository, 'findOne').mockResolvedValue(mockParticipant);
      jest.spyOn(walkParticipantRepository, 'save').mockResolvedValue(updatedParticipant);

      const result = await service.respondToInvitation(userId, walkId, status);

      expect(result).toEqual(updatedParticipant);
      expect(result.status).toBe(status);
    });

    it('should throw NotFoundException if invitation not found', async () => {
      jest.spyOn(walkParticipantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.respondToInvitation('user2', 'walk1', ParticipantStatus.CONFIRMED))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid status', async () => {
      const mockParticipant = {
        id: 'participant1',
        userId: 'user2',
        walkId: 'walk1',
        status: ParticipantStatus.PENDING,
      } as WalkParticipant;

      jest.spyOn(walkParticipantRepository, 'findOne').mockResolvedValue(mockParticipant);

      await expect(service.respondToInvitation('user2', 'walk1', ParticipantStatus.NO_RESPONSE))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('completeWalk', () => {
    it('should complete a walk successfully', async () => {
      const userId = 'user1';
      const walkId = 'walk1';

      const mockWalk = {
        id: walkId,
        title: 'Completed Walk',
        creatorId: userId,
        status: WalkStatus.ONGOING,
      } as Walk;

      const updatedWalk = {
        ...mockWalk,
        status: WalkStatus.COMPLETED,
        endTime: new Date(),
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);
      jest.spyOn(walkRepository, 'save').mockResolvedValue(updatedWalk);
      jest.spyOn(walkParticipantRepository, 'update').mockResolvedValue({} as any);

      const result = await service.completeWalk(userId, walkId);

      expect(result).toEqual(updatedWalk);
      expect(result.status).toBe(WalkStatus.COMPLETED);
    });

    it('should throw ForbiddenException if user is not creator', async () => {
      const userId = 'user2';
      const walkId = 'walk1';

      const mockWalk = {
        id: walkId,
        title: 'Ongoing Walk',
        creatorId: 'user1', // Different user is the creator
        status: WalkStatus.ONGOING,
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);

      await expect(service.completeWalk(userId, walkId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteWalk', () => {
    it('should delete a walk successfully', async () => {
      const walkId = 'walk1';
      const userId = 'user1';

      const mockWalk = {
        id: walkId,
        title: 'Planned Walk',
        creatorId: userId,
        status: WalkStatus.PLANNED,
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);
      jest.spyOn(walkRepository, 'remove').mockResolvedValue(mockWalk);

      const result = await service.deleteWalk(walkId, userId);

      expect(result.message).toBe('Walk deleted successfully');
      expect(result.id).toBe(walkId);
    });

    it('should throw BadRequestException if walk has started', async () => {
      const walkId = 'walk1';
      const userId = 'user1';

      const mockWalk = {
        id: walkId,
        title: 'Started Walk',
        creatorId: userId,
        status: WalkStatus.ONGOING, // Started walk
      } as Walk;

      jest.spyOn(walkRepository, 'findOne').mockResolvedValue(mockWalk);

      await expect(service.deleteWalk(walkId, userId)).rejects.toThrow(BadRequestException);
    });
  });
});