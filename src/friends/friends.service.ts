import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Driver, Session } from 'neo4j-driver';
import { Inject } from '@nestjs/common';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { AcceptFriendRequestDto } from './dto/accept-friend-request.dto';
import { FriendRequest, FriendRequestStatus } from './entities/friend-request.entity';
import { CypherQueries } from './utils/cypher-queries';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(@Inject('NEO4J_DRIVER') private readonly driver: Driver) {}

  private getSession(): Session {
    return this.driver.session();
  }

  async getFriends(userId: string) {
    this.logger.log(`Fetching friends for user ${userId}`);

    const session = this.getSession();
    try {
      const result = await session.run(CypherQueries.GET_FRIENDS, { userId });

      const friends = result.records.map(record => ({
        id: record.get('id'),
        email: record.get('email'),
        name: record.get('name'),
      }));

      return { friends, count: friends.length };
    } catch (error) {
      this.logger.error(`Error fetching friends for user ${userId}: ${error.message}`);
      throw new BadRequestException('Failed to fetch friends');
    } finally {
      await session.close();
    }
  }

  async sendFriendRequest(senderId: string, sendFriendRequestDto: SendFriendRequestDto) {
    const { receiverId } = sendFriendRequestDto;

    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    this.logger.log(`Sending friend request from ${senderId} to ${receiverId}`);

    const session = this.getSession();
    try {
      // Check if users exist
      const userCheckResult = await session.run(
        `MATCH (sender:User {id: $senderId}), (receiver:User {id: $receiverId}) RETURN sender, receiver`,
        { senderId, receiverId }
      );

      if (userCheckResult.records.length === 0) {
        throw new NotFoundException('One or both users not found');
      }

      // Check if they are already friends
      const friendshipCheckResult = await session.run(
        `MATCH (user1:User {id: $userId1})-[:FRIENDS]-(user2:User {id: $userId2}) RETURN user1, user2`,
        { userId1: senderId, userId2: receiverId }
      );

      if (friendshipCheckResult.records.length > 0) {
        throw new BadRequestException('Users are already friends');
      }

      // Check if a request already exists
      const existingRequestResult = await session.run(
        `MATCH (sender:User {id: $senderId})-[r:REQUESTED_FRIENDSHIP]->(receiver:User {id: $receiverId})
         WHERE r.status = 'pending'
         RETURN r`,
        { senderId, receiverId }
      );

      if (existingRequestResult.records.length > 0) {
        throw new BadRequestException('Friend request already exists');
      }

      // Create the friend request
      const result = await session.run(CypherQueries.SEND_FRIEND_REQUEST, {
        senderId,
        receiverId,
        status: FriendRequestStatus.PENDING,
        createdAt: new Date().toISOString(),
      });

      if (result.records.length === 0) {
        throw new BadRequestException('Failed to send friend request');
      }

      const requestId = result.records[0].get('requestId');

      return {
        requestId,
        senderId,
        receiverId,
        status: FriendRequestStatus.PENDING,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error sending friend request from ${senderId} to ${receiverId}: ${error.message}`);
      throw error;
    } finally {
      await session.close();
    }
  }

  async acceptFriendRequest(receiverId: string, requestId: string, status: FriendRequestStatus) {
    if (status !== FriendRequestStatus.ACCEPTED && status !== FriendRequestStatus.REJECTED) {
      throw new BadRequestException('Status must be either "accepted" or "rejected"');
    }

    this.logger.log(`Processing friend request ${requestId} for user ${receiverId}`);

    const session = this.getSession();
    try {
      // Get the friend request to verify it exists and is for this user
      const requestResult = await session.run(CypherQueries.GET_FRIEND_REQUEST, { requestId });

      if (requestResult.records.length === 0) {
        throw new NotFoundException('Friend request not found');
      }

      const request = requestResult.records[0];
      const senderId = request.get('senderId');

      if (request.get('receiverId') !== receiverId) {
        throw new UnauthorizedException('You are not authorized to modify this request');
      }

      if (request.get('status') !== FriendRequestStatus.PENDING) {
        throw new BadRequestException('This request has already been processed');
      }

      let result;
      if (status === FriendRequestStatus.ACCEPTED) {
        // Accept the request and create a friendship relationship
        result = await session.run(CypherQueries.ACCEPT_FRIEND_REQUEST, {
          receiverId,
          requestId,
          newStatus: status,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Reject the request
        result = await session.run(CypherQueries.REJECT_FRIEND_REQUEST, {
          receiverId,
          requestId,
          newStatus: status,
          updatedAt: new Date().toISOString(),
        });
      }

      if (result.records.length === 0) {
        throw new BadRequestException('Failed to update friend request');
      }

      return {
        requestId: result.records[0].get('requestId'),
        status: result.records[0].get('status'),
        message: status === FriendRequestStatus.ACCEPTED ? 'Friend request accepted successfully' : 'Friend request rejected'
      };
    } catch (error) {
      this.logger.error(`Error processing friend request ${requestId} for user ${receiverId}: ${error.message}`);
      throw error;
    } finally {
      await session.close();
    }
  }

  async removeFriend(userId: string, friendId: string) {
    this.logger.log(`Removing friend ${friendId} for user ${userId}`);

    const session = this.getSession();
    try {
      // Check if they are actually friends
      const friendshipCheckResult = await session.run(
        `MATCH (user1:User {id: $userId1})-[:FRIENDS]-(user2:User {id: $userId2}) RETURN user1, user2`,
        { userId1: userId, userId2: friendId }
      );

      if (friendshipCheckResult.records.length === 0) {
        throw new BadRequestException('Users are not friends');
      }

      // Remove the friendship relationship
      const result = await session.run(CypherQueries.REMOVE_FRIEND, {
        userId,
        friendId,
      });

      const deletedCount = result.records[0]?.get('deletedCount') || 0;

      if (deletedCount === 0) {
        throw new BadRequestException('Failed to remove friend');
      }

      return {
        message: 'Friend removed successfully',
        removed: true,
        deletedRelationships: deletedCount,
      };
    } catch (error) {
      this.logger.error(`Error removing friend ${friendId} for user ${userId}: ${error.message}`);
      throw error;
    } finally {
      await session.close();
    }
  }

  // Additional helper methods

  async getFriendRequests(userId: string, status: FriendRequestStatus = FriendRequestStatus.PENDING) {
    this.logger.log(`Fetching ${status} friend requests for user ${userId}`);

    const session = this.getSession();
    try {
      // Fetch received friend requests with specified status
      const result = await session.run(CypherQueries.GET_FRIEND_REQUESTS_FOR_USER, {
        userId,
        status,
      });

      const requests = result.records.map(record => ({
        id: record.get('id'),
        senderId: record.get('senderId'),
        receiverId: userId,
        status: record.get('status'),
        createdAt: new Date(record.get('createdAt')),
        senderEmail: record.get('senderEmail'),
      }));

      return { requests, count: requests.length };
    } catch (error) {
      this.logger.error(`Error fetching friend requests for user ${userId}: ${error.message}`);
      throw new BadRequestException('Failed to fetch friend requests');
    } finally {
      await session.close();
    }
  }

  async getSentFriendRequests(userId: string) {
    this.logger.log(`Fetching sent friend requests for user ${userId}`);

    const session = this.getSession();
    try {
      const result = await session.run(CypherQueries.GET_SENT_FRIEND_REQUESTS, {
        userId,
        status: FriendRequestStatus.PENDING,
      });

      const requests = result.records.map(record => ({
        id: record.get('id'),
        senderId: userId,
        receiverId: record.get('receiverId'),
        status: record.get('status'),
        createdAt: new Date(record.get('createdAt')),
        receiverEmail: record.get('receiverEmail'),
      }));

      return { requests, count: requests.length };
    } catch (error) {
      this.logger.error(`Error fetching sent friend requests for user ${userId}: ${error.message}`);
      throw new BadRequestException('Failed to fetch sent friend requests');
    } finally {
      await session.close();
    }
  }
}