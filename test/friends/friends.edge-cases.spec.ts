import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { FriendsService } from '../../src/friends/friends.service';
import { FriendRequestStatus } from '../../src/friends/entities/friend-request.entity';
import { SendFriendRequestDto } from '../../src/friends/dto/send-friend-request.dto';

// Mock the neo4j driver
const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
};

const mockDriver = {
  session: jest.fn(() => mockSession),
};

describe('FriendsService Edge Cases', () => {
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

  describe('sendFriendRequest edge cases', () => {
    it('should handle very long user IDs gracefully', async () => {
      const veryLongId = 'a'.repeat(100);
      const sendFriendRequestDto: SendFriendRequestDto = { receiverId: 'user2' };

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [{ get: () => true }] }) // user existence check
        .mockResolvedValueOnce({ records: [] }) // friendship check
        .mockResolvedValueOnce({ records: [] }) // existing request check
        .mockResolvedValueOnce({
          records: [{
            get: (field: string) => field === 'requestId' ? 'newRequestId' : null,
          }],
        });

      const result = await service.sendFriendRequest(veryLongId, sendFriendRequestDto);

      expect(result.senderId).toBe(veryLongId);
    });

    it('should prevent duplicate requests properly', async () => {
      const senderId = 'user1';
      const receiverId = 'user2';
      const sendFriendRequestDto: SendFriendRequestDto = { receiverId };

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [{ get: () => true }] }) // user existence check
        .mockResolvedValueOnce({ records: [] }) // friendship check
        .mockResolvedValueOnce({ records: [{}] }); // existing request found

      await expect(service.sendFriendRequest(senderId, sendFriendRequestDto))
        .rejects.toThrow(BadRequestException);
      expect((mockSession.run as jest.Mock).mock.calls[2][0]).toContain('REQUESTED_FRIENDSHIP');
    });

    it('should handle users who are already friends', async () => {
      const senderId = 'user1';
      const receiverId = 'user2';
      const sendFriendRequestDto: SendFriendRequestDto = { receiverId };

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [{ get: () => true }] }) // user existence check
        .mockResolvedValueOnce({ records: [{}] }); // friendship already exists

      await expect(service.sendFriendRequest(senderId, sendFriendRequestDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptFriendRequest edge cases', () => {
    it('should handle request that has already been processed', async () => {
      const receiverId = 'user2';
      const requestId = 'request1';
      const status = FriendRequestStatus.ACCEPTED;

      const mockRequest = {
        get: (field: string) => {
          if (field === 'senderId') return 'user1';
          if (field === 'receiverId') return receiverId;
          if (field === 'status') return FriendRequestStatus.ACCEPTED; // Already processed
          return null;
        },
      };

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [mockRequest] });

      await expect(service.acceptFriendRequest(receiverId, requestId, status))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle non-existent requests', async () => {
      const receiverId = 'user2';
      const requestId = 'nonexistent';
      const status = FriendRequestStatus.ACCEPTED;

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [] }); // Request not found

      await expect(service.acceptFriendRequest(receiverId, requestId, status))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle unauthorized access to request', async () => {
      const receiverId = 'user3'; // Different from actual receiver
      const requestId = 'request1';
      const status = FriendRequestStatus.ACCEPTED;

      const mockRequest = {
        get: (field: string) => {
          if (field === 'senderId') return 'user1';
          if (field === 'receiverId') return 'user2'; // Actual receiver is user2
          if (field === 'status') return FriendRequestStatus.PENDING;
          return null;
        },
      };

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [mockRequest] });

      await expect(service.acceptFriendRequest(receiverId, requestId, status))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('removeFriend edge cases', () => {
    it('should handle attempts to remove non-friends', async () => {
      const userId = 'user1';
      const friendId = 'user2';

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [] }); // No friendship found

      await expect(service.removeFriend(userId, friendId))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle very long UUIDs', async () => {
      const veryLongUserId = 'a'.repeat(100);
      const veryLongFriendId = 'b'.repeat(100);

      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [{}] }) // friendship check
        .mockResolvedValueOnce({ records: [{ get: (field: string) => field === 'deletedCount' ? 1 : null }] }); // remove friend

      const result = await service.removeFriend(veryLongUserId, veryLongFriendId);

      expect(result.removed).toBe(true);
    });
  });

  describe('getFriends edge cases', () => {
    it('should handle user with no friends', async () => {
      const userId = 'user1';

      (mockSession.run as jest.Mock).mockResolvedValue({
        records: [],
      });

      const result = await service.getFriends(userId);

      expect(result.friends).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should handle invalid user ID', async () => {
      const userId = 'invalid-user';

      (mockSession.run as jest.Mock).mockRejectedValue(new Error('Invalid user ID'));

      await expect(service.getFriends(userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFriendRequests edge cases', () => {
    it('should handle user with no friend requests', async () => {
      const userId = 'user1';
      const status = FriendRequestStatus.PENDING;

      (mockSession.run as jest.Mock).mockResolvedValue({
        records: [],
      });

      const result = await service.getFriendRequests(userId, status);

      expect(result.requests).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should handle different request statuses', async () => {
      const userId = 'user1';
      const status = FriendRequestStatus.REJECTED;

      (mockSession.run as jest.Mock).mockResolvedValue({
        records: [],
      });

      const result = await service.getFriendRequests(userId, status);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (sender:User)-[r:REQUESTED_FRIENDSHIP]->(receiver:User {id: $userId})'),
        expect.objectContaining({ status })
      );
    });
  });

  describe('getSentFriendRequests edge cases', () => {
    it('should handle user with no sent requests', async () => {
      const userId = 'user1';

      (mockSession.run as jest.Mock).mockResolvedValue({
        records: [],
      });

      const result = await service.getSentFriendRequests(userId);

      expect(result.requests).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should return only pending sent requests', async () => {
      const userId = 'user1';

      (mockSession.run as jest.Mock).mockResolvedValue({
        records: [],
      });

      await service.getSentFriendRequests(userId);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (sender:User {id: $userId})-[r:REQUESTED_FRIENDSHIP]->(receiver:User)'),
        expect.objectContaining({ status: FriendRequestStatus.PENDING })
      );
    });
  });

  describe('session and connection edge cases', () => {
    it('should properly close session even if error occurs', async () => {
      const userId = 'user1';
      (mockSession.run as jest.Mock).mockRejectedValue(new Error('Connection error'));

      await expect(service.getFriends(userId)).rejects.toThrow(BadRequestException);
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle database timeout gracefully', async () => {
      const userId = 'user1';
      const timeoutError = new Error('Database timeout');
      (mockSession.run as jest.Mock).mockRejectedValue(timeoutError);

      await expect(service.getFriends(userId)).rejects.toThrow(BadRequestException);
    });
  });
});