import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Walk } from './entities/walk.entity';
import { WalkParticipant, ParticipantStatus } from './entities/walk-participant.entity';
import { User } from '../auth/entities/user.entity';
import { Path } from '../paths/entities/path.entity';
import { CreateWalkDto } from './dto/create-walk.dto';
import { UpdateWalkDto } from './dto/update-walk.dto';
import { CompleteWalkDto } from './dto/complete-walk.dto';
import { WalkStatus } from './entities/walk.entity';

@Injectable()
export class WalksService {
  private readonly logger = new Logger(WalksService.name);

  constructor(
    @InjectRepository(Walk)
    private walkRepository: Repository<Walk>,
    @InjectRepository(WalkParticipant)
    private walkParticipantRepository: Repository<WalkParticipant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Path)
    private pathRepository: Repository<Path>,
  ) {}

  async createWalk(creatorId: string, createWalkDto: CreateWalkDto) {
    this.logger.log(`Creating walk for user ${creatorId}`);

    // Validate required fields
    if (!createWalkDto.title || typeof createWalkDto.title !== 'string' || createWalkDto.title.trim() === '') {
      throw new BadRequestException('Title is required');
    }

    // Validate path exists if provided
    if (createWalkDto.pathId) {
      const path = await this.pathRepository.findOne({ where: { id: createWalkDto.pathId } });
      if (!path) {
        throw new BadRequestException('Specified path does not exist');
      }
    }

    // Create the walk
    const walk = new Walk();
    walk.title = createWalkDto.title;
    walk.description = createWalkDto.description || null;
    walk.pathId = createWalkDto.pathId;
    walk.startTime = createWalkDto.startTime ? new Date(createWalkDto.startTime) : null;
    walk.endTime = createWalkDto.endTime ? new Date(createWalkDto.endTime) : null;
    walk.status = createWalkDto.status || WalkStatus.PLANNED;
    walk.creatorId = creatorId;

    const savedWalk = await this.walkRepository.save(walk);

    // Create creator as the first participant with confirmed status
    const creatorParticipant = new WalkParticipant();
    creatorParticipant.walkId = savedWalk.id;
    creatorParticipant.userId = creatorId;
    creatorParticipant.status = ParticipantStatus.CONFIRMED;
    creatorParticipant.joinedAt = new Date();
    creatorParticipant.respondedAt = new Date();
    creatorParticipant.createdAt = new Date();

    await this.walkParticipantRepository.save(creatorParticipant);

    // If inviteeIds are provided, create invitations
    if (createWalkDto.inviteeIds && createWalkDto.inviteeIds.length > 0) {
      // Call inviteParticipants without validation checks since the creator is creating the walk
      await this.createInvitationsWithoutValidation(savedWalk.id, createWalkDto.inviteeIds);
    }

    return savedWalk;
  }

  // Helper method to create invitations during walk creation without validation
  private async createInvitationsWithoutValidation(walkId: string, userIds: string[]) {
    // Verify that the specified users exist
    const users = await this.userRepository.findByIds(userIds);
    if (users.length !== userIds.length) {
      // Find which users don't exist
      const foundUserIds = users.map(u => u.id);
      const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));
      throw new BadRequestException(`Users not found: ${missingUserIds.join(', ')}`);
    }

    // Check if users are already invited or participating in this walk
    const existingParticipants = await this.walkParticipantRepository.find({
      where: {
        walkId,
        userId: In(userIds),
      },
    });

    if (existingParticipants && existingParticipants.length > 0) {
      const existingUserIds = existingParticipants.map(p => p.userId);
      throw new BadRequestException(`Users already invited/participating: ${existingUserIds.join(', ')}`);
    }

    // Create participants with PENDING status
    const newParticipants = userIds.map(userId => {
      const participant = new WalkParticipant();
      participant.walkId = walkId;
      participant.userId = userId;
      participant.status = ParticipantStatus.PENDING;
      participant.createdAt = new Date();
      return participant;
    });

    const savedParticipants = await this.walkParticipantRepository.save(newParticipants);

    // Log that invitations were sent
    this.logger.log(`Walk invitations sent to ${userIds.length} users for walk ${walkId}`);

    return savedParticipants;
  }

  async getWalks(userId: string, query: any = {}) {
    this.logger.log(`Fetching walks for user ${userId}`);

    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 10, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Get walks where the user is either the creator or a participant
    const queryBuilder = this.walkRepository.createQueryBuilder('walk')
      .leftJoin(WalkParticipant, 'participant', 'participant.walkId = walk.id')
      .leftJoin(Path, 'path', 'path.id = walk.pathId')
      .where('(walk.creatorId = :userId OR participant.userId = :userId)', { userId })
      .addOrderBy('walk.createdAt', 'DESC');

    // Apply status filter if provided
    if (query.status) {
      queryBuilder.andWhere('walk.status = :status', { status: query.status });
    }

    // Apply date range filter if provided
    if (query.startDate) {
      queryBuilder.andWhere('walk.startTime >= :startDate', { startDate: new Date(query.startDate) });
    }
    if (query.endDate) {
      queryBuilder.andWhere('walk.endTime <= :endDate', { endDate: new Date(query.endDate) });
    }

    const [walks, totalCount] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      data: walks,
      meta: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getWalkById(id: string, userId: string) {
    this.logger.log(`Fetching walk ${id} for user ${userId}`);

    const walk = await this.walkRepository.findOne({
      where: { id },
      relations: ['participants', 'participants.user', 'creator', 'path'],
    });

    if (!walk) {
      throw new NotFoundException(`Walk with ID ${id} not found`);
    }

    // Check if user is a participant or the creator
    const isCreator = walk.creatorId === userId;
    const isParticipant = (walk.participants || []).some(p => p.userId === userId);

    if (!isCreator && !isParticipant) {
      throw new ForbiddenException('Access denied: You are not a participant or creator of this walk');
    }

    return walk;
  }

  async updateWalk(id: string, userId: string, updateWalkDto: UpdateWalkDto) {
    this.logger.log(`Updating walk ${id} by user ${userId}`);

    const walk = await this.walkRepository.findOne({
      where: { id, creatorId: userId },
    });

    if (!walk) {
      throw new NotFoundException('Walk not found or you are not the creator');
    }

    // Only allow updating if the walk hasn't started yet
    if (walk.status !== WalkStatus.PLANNED) {
      throw new BadRequestException('Cannot update walk after it has started');
    }

    // Update fields
    if (updateWalkDto.title) walk.title = updateWalkDto.title;
    if (updateWalkDto.description !== undefined) walk.description = updateWalkDto.description;
    if (updateWalkDto.pathId) {
      const path = await this.pathRepository.findOne({ where: { id: updateWalkDto.pathId } });
      if (!path) {
        throw new BadRequestException('Specified path does not exist');
      }
      walk.pathId = updateWalkDto.pathId;
    }
    if (updateWalkDto.startTime) walk.startTime = new Date(updateWalkDto.startTime);
    if (updateWalkDto.endTime) walk.endTime = new Date(updateWalkDto.endTime);

    return await this.walkRepository.save(walk);
  }

  async inviteParticipants(creatorId: string, walkId: string, userIds: string[]) {
    this.logger.log(`User ${creatorId} inviting ${userIds.length} users to walk ${walkId}`);

    // First, verify the walk exists and the user is the creator
    const walk = await this.walkRepository.findOne({ where: { id: walkId } });
    if (!walk) {
      throw new NotFoundException('Walk not found');
    }

    if (walk.creatorId !== creatorId) {
      throw new ForbiddenException('Only the creator can invite participants');
    }

    // Verify that the specified users exist
    const users = await this.userRepository.findByIds(userIds);
    if (users.length !== userIds.length) {
      // Find which users don't exist
      const foundUserIds = users.map(u => u.id);
      const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));
      throw new BadRequestException(`Users not found: ${missingUserIds.join(', ')}`);
    }

    // Check if users are already invited or participating in this walk
    const existingParticipants = await this.walkParticipantRepository.find({
      where: {
        walkId,
        userId: In(userIds),
      },
    });

    if (existingParticipants && existingParticipants.length > 0) {
      const existingUserIds = existingParticipants.map(p => p.userId);
      throw new BadRequestException(`Users already invited/participating: ${existingUserIds.join(', ')}`);
    }

    // Create participants with PENDING status
    const newParticipants = userIds.map(userId => {
      const participant = new WalkParticipant();
      participant.walkId = walkId;
      participant.userId = userId;
      participant.status = ParticipantStatus.PENDING;
      participant.createdAt = new Date();
      return participant;
    });

    const savedParticipants = await this.walkParticipantRepository.save(newParticipants);

    // In a real implementation, we would send notifications here
    // For now, we'll just log that invitations were sent
    this.logger.log(`Walk invitations sent to ${userIds.length} users for walk ${walkId}`);
    return savedParticipants;
  }

  async respondToInvitation(userId: string, walkId: string, status: ParticipantStatus) {
    this.logger.log(`User ${userId} responding to walk invitation ${walkId} with status ${status}`);

    // Only allow certain statuses as responses
    if (![ParticipantStatus.CONFIRMED, ParticipantStatus.DECLINED].includes(status)) {
      throw new BadRequestException('Invalid response status. Only CONFIRMED or DECLINED allowed.');
    }

    // Find the participant record
    const participant = await this.walkParticipantRepository.findOne({
      where: { userId, walkId },
    });

    if (!participant) {
      throw new NotFoundException('Walk invitation not found');
    }

    // Update the participant's response
    participant.status = status;
    participant.respondedAt = new Date();

    if (status === ParticipantStatus.CONFIRMED) {
      participant.joinedAt = new Date();
    }

    const updatedParticipant = await this.walkParticipantRepository.save(participant);

    return updatedParticipant;
  }

  async completeWalk(userId: string, walkId: string, completeWalkDto?: CompleteWalkDto) {
    this.logger.log(`User ${userId} attempting to complete walk ${walkId}`);

    // Only the creator can complete the walk
    const walk = await this.walkRepository.findOne({ where: { id: walkId } });
    if (!walk) {
      throw new NotFoundException('Walk not found');
    }

    if (walk.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can mark a walk as completed');
    }

    // Update the walk status to completed
    walk.status = WalkStatus.COMPLETED;
    walk.endTime = walk.endTime || new Date(); // Set end time if not already set

    const updatedWalk = await this.walkRepository.save(walk);

    // Mark all confirmed participants as attended
    await this.walkParticipantRepository.update(
      {
        walkId: walk.id,
        status: ParticipantStatus.CONFIRMED
      },
      { attended: true }
    );

    // Update participant statistics and visited places history
    await this.updateParticipantStats(userId, walkId);
    await this.saveVisitedPlacesHistory(walkId);

    return updatedWalk;
  }

  async deleteWalk(id: string, userId: string) {
    this.logger.log(`Deleting walk ${id} by user ${userId}`);

    // First check if walk exists
    const walk = await this.walkRepository.findOne({
      where: { id },
    });

    if (!walk) {
      throw new NotFoundException('Walk not found');
    }

    // Check if user is the creator
    if (walk.creatorId !== userId) {
      // For security, return the same error for authorization issues to avoid leaking info
      throw new NotFoundException('Walk not found or you are not the creator');
    }

    // Prevent deletion of walks that have started
    if (walk.status !== WalkStatus.PLANNED) {
      throw new BadRequestException('Cannot delete a walk that has already started');
    }

    await this.walkRepository.remove(walk);

    return { message: 'Walk deleted successfully', id };
  }

  // Additional utility methods
  async getUserParticipatedWalks(userId: string) {
    const participants = await this.walkParticipantRepository.find({
      where: { userId, status: ParticipantStatus.CONFIRMED, attended: true },
      relations: ['walk'],
    });

    return participants.map(p => p.walk);
  }

  async getUserInvitations(userId: string) {
    return await this.walkParticipantRepository.find({
      where: { userId, status: ParticipantStatus.PENDING },
      relations: ['walk', 'walk.creator'],
    });
  }

  private async updateParticipantStats(userId: string, walkId: string) {
    // In a real implementation, this would update user statistics
    // For example: number of walks completed, total distance walked, etc.
    // For now, we'll just log this action
    this.logger.log(`Updating statistics for user ${userId} after completing walk ${walkId}`);

    // This is where we would update user statistics in the User entity
    // or create a separate statistics entity
  }

  private async saveVisitedPlacesHistory(walkId: string) {
    // In a real implementation, this would save the visited places
    // for use in recommendation systems
    // For now, we'll just log this action
    this.logger.log(`Saving visited places history for walk ${walkId}`);

    // This is where we would save the connection between the user
    // and the places they visited during this walk, potentially by:
    // 1. Getting the path associated with this walk
    // 2. Getting all places in that path
    // 3. Creating a record of the user visiting those places during this walk
    // 4. Saving this information for future recommendations

    const walk = await this.walkRepository.findOne({
      where: { id: walkId },
      relations: ['path'],
    });

    if (walk && walk.pathId) {
      // In a real implementation, we would fetch the path and its places
      // and save this information for the recommendation system
      this.logger.log(`Walk ${walkId} is associated with path ${walk.pathId}`);
    }
  }
}