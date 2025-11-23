import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { FriendsController } from '../../src/friends/friends.controller';
import { FriendsService } from '../../src/friends/friends.service';
import { SendFriendRequestDto } from '../../src/friends/dto/send-friend-request.dto';
import { AcceptFriendRequestDto } from '../../src/friends/dto/accept-friend-request.dto';
import { FriendRequestStatus } from '../../src/friends/entities/friend-request.entity';

describe('FriendsController', () => {
  let controller: FriendsController;
  let service: FriendsService;

  const mockFriendsService = {
    getFriends: jest.fn(),
    sendFriendRequest: jest.fn(),
    acceptFriendRequest: jest.fn(),
    removeFriend: jest.fn(),
    getFriendRequests: jest.fn(),
    getSentFriendRequests: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendsController],
      providers: [
        {
          provide: FriendsService,
          useValue: mockFriendsService,
        },
      ],
    }).compile();

    controller = module.get<FriendsController>(FriendsController);
    service = module.get<FriendsService>(FriendsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFriends', () => {
    it('should return friends list for a user', async () => {
      const req = { user: { id: 'user1' } };
      const mockFriendsResult = { friends: [], count: 0 };

      (mockFriendsService.getFriends as jest.Mock).mockResolvedValue(mockFriendsResult);

      const result = await controller.getFriends(req);

      expect(service.getFriends).toHaveBeenCalledWith('user1');
      expect(result).toEqual(mockFriendsResult);
    });
  });

  describe('sendFriendRequest', () => {
    it('should send a friend request', async () => {
      const req = { user: { id: 'user1' } };
      const sendFriendRequestDto: SendFriendRequestDto = { receiverId: 'user2' };
      const mockResult = { requestId: 'req1', status: FriendRequestStatus.PENDING };

      (mockFriendsService.sendFriendRequest as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.sendFriendRequest(req, sendFriendRequestDto);

      expect(service.sendFriendRequest).toHaveBeenCalledWith('user1', sendFriendRequestDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept a friend request', async () => {
      const req = { user: { id: 'user2' } };
      const requestId = 'req1';
      const acceptFriendRequestDto: AcceptFriendRequestDto = { 
        requestId, 
        status: FriendRequestStatus.ACCEPTED 
      };
      const mockResult = { requestId, status: FriendRequestStatus.ACCEPTED, message: 'accepted' };

      (mockFriendsService.acceptFriendRequest as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.acceptFriendRequest(req, requestId, acceptFriendRequestDto);

      expect(service.acceptFriendRequest).toHaveBeenCalledWith('user2', requestId, FriendRequestStatus.ACCEPTED);
      expect(result).toEqual(mockResult);
    });
  });

  describe('removeFriend', () => {
    it('should remove a friend', async () => {
      const req = { user: { id: 'user1' } };
      const userId = 'user2';
      const mockResult = { message: 'removed', removed: true };

      (mockFriendsService.removeFriend as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.removeFriend(req, userId);

      expect(service.removeFriend).toHaveBeenCalledWith('user1', userId);
      expect(result).toEqual(mockResult);
    });
  });

  // Test error handling
  describe('error handling', () => {
    it('should handle service errors gracefully - getFriends', async () => {
      const req = { user: { id: 'user1' } };
      (mockFriendsService.getFriends as jest.Mock).mockRejectedValue(new BadRequestException('Test error'));

      await expect(controller.getFriends(req)).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors gracefully - sendFriendRequest', async () => {
      const req = { user: { id: 'user1' } };
      const sendFriendRequestDto: SendFriendRequestDto = { receiverId: 'user2' };
      (mockFriendsService.sendFriendRequest as jest.Mock).mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.sendFriendRequest(req, sendFriendRequestDto)).rejects.toThrow(NotFoundException);
    });

    it('should handle service errors gracefully - acceptFriendRequest', async () => {
      const req = { user: { id: 'user2' } };
      const requestId = 'req1';
      const acceptFriendRequestDto: AcceptFriendRequestDto = { 
        requestId, 
        status: FriendRequestStatus.ACCEPTED 
      };
      (mockFriendsService.acceptFriendRequest as jest.Mock).mockRejectedValue(new UnauthorizedException());

      await expect(controller.acceptFriendRequest(req, requestId, acceptFriendRequestDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});