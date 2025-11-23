import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { FriendsService } from '../../src/friends/friends.service';
import { FriendRequestStatus } from '../../src/friends/entities/friend-request.entity';
import { SendFriendRequestDto } from '../../src/friends/dto/send-friend-request.dto';
import { CypherQueries } from '../../src/friends/utils/cypher-queries';

// Mock the neo4j driver
const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
};

const mockDriver = {
  session: jest.fn(() => mockSession),
};

describe('FriendsService', () => {
  let service: FriendsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        {
          provide: 'NEO4J_DRIVER',
          useValue: mockDriver,
        },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFriends', () => {
    it('should return friends for a user', async () => {
      const userId = 'user1';
      const mockFriends = [
        { id: 'user2', email: 'user2@example.com', name: 'User Two' },
        { id: 'user3', email: 'user3@example.com', name: 'User Three' },
      ];

      (mockSession.run as jest.Mock).mockResolvedValue({
        records: mockFriends.map(f => ({
          get: (field: string) => f[field as keyof typeof f],
        })),
      });

      const result = await service.getFriends(userId);

      expect(mockSession.run).toHaveBeenCalledWith(CypherQueries.GET_FRIENDS, { userId });
      expect(result).toEqual({ friends: mockFriends, count: 2 });
    });

    it('should throw BadRequestException when fetching fails', async () => {
      const userId = 'user1';
      (mockSession.run as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.getFriends(userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendFriendRequest', () => {
    it('should send a friend request successfully', async () => {
      const senderId = 'user1';
      const receiverId = 'user2';
      const sendFriendRequestDto: SendFriendRequestDto = { receiverId };
      const mockRequestId = 'request1';

      // Mock user existence check
      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [{ get: () => true }] }) // user existence check
        .mockResolvedValueOnce({ records: [] }) // friendship check
        .mockResolvedValueOnce({ records: [] }) // existing request check
        .mockResolvedValueOnce({
          records: [{
            get: (field: string) => field === 'requestId' ? mockRequestId : null,
          }],
        }); // actual request creation

      const result = await service.sendFriendRequest(senderId, sendFriendRequestDto);

      expect(mockSession.run).toHaveBeenCalledTimes(4);
      expect(result).toMatchObject({
        requestId: mockRequestId,
        senderId,
        receiverId,
        status: FriendRequestStatus.PENDING,
      });
    });

    it('should throw BadRequestException when sender tries to send request to themselves', async () => {
      const senderId = 'user1';
      const sendFriendRequestDto: SendFriendRequestDto = { receiverId: 'user1' };

      await expect(service.sendFriendRequest(senderId, sendFriendRequestDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when request already exists', async () => {
      const senderId = 'user1';
      const receiverId = 'user2';
      const sendFriendRequestDto: SendFriendRequestDto = { receiverId };

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [{ get: () => true }] }) // user existence check
        .mockResolvedValueOnce({ records: [] }) // friendship check
        .mockResolvedValueOnce({ records: [{}] }); // existing request found

      await expect(service.sendFriendRequest(senderId, sendFriendRequestDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const senderId = 'user1';
      const receiverId = 'nonexistent';
      const sendFriendRequestDto: SendFriendRequestDto = { receiverId };

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [] }); // no users found

      await expect(service.sendFriendRequest(senderId, sendFriendRequestDto))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept a friend request successfully', async () => {
      const receiverId = 'user2';
      const requestId = 'request1';
      const status = FriendRequestStatus.ACCEPTED;
      
      const mockRequest = {
        get: (field: string) => {
          if (field === 'senderId') return 'user1';
          if (field === 'receiverId') return receiverId;
          if (field === 'status') return FriendRequestStatus.PENDING;
          return null;
        },
      };

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [mockRequest] }) // get friend request
        .mockResolvedValueOnce({ records: [{ get: (field: string) => field === 'requestId' ? requestId : status }] }); // accept request

      const result = await service.acceptFriendRequest(receiverId, requestId, status);

      expect(mockSession.run).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({
        requestId,
        status,
        message: 'Friend request accepted successfully',
      });
    });

    it('should reject a friend request', async () => {
      const receiverId = 'user2';
      const requestId = 'request1';
      const status = FriendRequestStatus.REJECTED;

      const mockRequest = {
        get: (field: string) => {
          if (field === 'senderId') return 'user1';
          if (field === 'receiverId') return receiverId;
          if (field === 'status') return FriendRequestStatus.PENDING;
          return null;
        },
      };

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [mockRequest] }) // get friend request
        .mockResolvedValueOnce({ records: [{ get: (field: string) => field === 'requestId' ? requestId : status }] }); // reject request

      const result = await service.acceptFriendRequest(receiverId, requestId, status);

      expect(result.message).toBe('Friend request rejected');
    });

    it('should throw UnauthorizedException when user is not the receiver', async () => {
      const receiverId = 'user3'; // different from the actual receiver
      const requestId = 'request1';
      const status = FriendRequestStatus.ACCEPTED;

      const mockRequest = {
        get: (field: string) => {
          if (field === 'senderId') return 'user1';
          if (field === 'receiverId') return 'user2'; // actual receiver
          if (field === 'status') return FriendRequestStatus.PENDING;
          return null;
        },
      };

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [mockRequest] });

      await expect(service.acceptFriendRequest(receiverId, requestId, status))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for invalid status', async () => {
      const receiverId = 'user2';
      const requestId = 'request1';
      const status = 'invalid_status' as FriendRequestStatus;

      await expect(service.acceptFriendRequest(receiverId, requestId, status))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('removeFriend', () => {
    it('should remove a friend successfully', async () => {
      const userId = 'user1';
      const friendId = 'user2';

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [{}] }) // friendship check
        .mockResolvedValueOnce({ records: [{ get: (field: string) => field === 'deletedCount' ? 2 : null }] }); // remove friend

      const result = await service.removeFriend(userId, friendId);

      expect(mockSession.run).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        message: 'Friend removed successfully',
        removed: true,
        deletedRelationships: 2,
      });
    });

    it('should throw BadRequestException when users are not friends', async () => {
      const userId = 'user1';
      const friendId = 'user2';

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [] }); // no friendship found

      await expect(service.removeFriend(userId, friendId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getFriendRequests', () => {
    it('should return friend requests for a user', async () => {
      const userId = 'user1';
      const status = FriendRequestStatus.PENDING;
      const mockRequests = [
        { id: 'req1', senderId: 'user2', receiverId: userId, status: 'pending', createdAt: new Date(), senderEmail: 'user2@example.com' },
      ];

      (mockSession.run as jest.Mock).mockResolvedValue({
        records: mockRequests.map(req => ({
          get: (field: string) => req[field as keyof typeof req],
        })),
      });

      const result = await service.getFriendRequests(userId, status);

      expect(mockSession.run).toHaveBeenCalledWith(CypherQueries.GET_FRIEND_REQUESTS_FOR_USER, {
        userId,
        status,
      });
      expect(result).toEqual({ requests: mockRequests, count: 1 });
    });
  });

  describe('getSentFriendRequests', () => {
    it('should return sent friend requests for a user', async () => {
      const userId = 'user1';
      const mockRequests = [
        { id: 'req1', receiverId: 'user2', senderId: userId, status: 'pending', createdAt: new Date(), receiverEmail: 'user2@example.com' },
      ];

      (mockSession.run as jest.Mock).mockResolvedValue({
        records: mockRequests.map(req => ({
          get: (field: string) => req[field as keyof typeof req],
        })),
      });

      const result = await service.getSentFriendRequests(userId);

      expect(mockSession.run).toHaveBeenCalledWith(CypherQueries.GET_SENT_FRIEND_REQUESTS, {
        userId,
        status: FriendRequestStatus.PENDING,
      });
      expect(result).toEqual({ requests: mockRequests, count: 1 });
    });
  });
});