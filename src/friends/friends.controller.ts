import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { AcceptFriendRequestDto } from './dto/accept-friend-request.dto';
import { RemoveFriendDto } from './dto/remove-friend.dto';
import { FriendRequestStatus } from './entities/friend-request.entity';

@ApiTags('Friends')
@Controller('friends')
export class FriendsController {
  private readonly logger = new Logger(FriendsController.name);

  constructor(private readonly friendsService: FriendsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get list of friends for authenticated user' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Friends retrieved successfully',
    schema: {
      example: [
        {
          id: 'friend-uuid',
          email: 'friend@example.com',
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      ]
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFriends(@Request() req) {
    this.logger.log(`Getting friends for user: ${req.user.id}`);
    return await this.friendsService.getFriends(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a friend request to another user' })
  @ApiBearerAuth()
  @ApiBody({ type: SendFriendRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Friend request sent successfully',
    schema: {
      example: {
        id: 'request-uuid',
        senderId: 'sender-uuid',
        receiverId: 'receiver-uuid',
        status: 'pending',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Receiver user not found' })
  async sendFriendRequest(
    @Request() req,
    @Body() sendFriendRequestDto: SendFriendRequestDto
  ) {
    this.logger.log(`User ${req.user.id} sending friend request to ${sendFriendRequestDto.receiverId}`);
    return await this.friendsService.sendFriendRequest(req.user.id, sendFriendRequestDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('requests/:requestId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept or decline a friend request' })
  @ApiBearerAuth()
  @ApiParam({ name: 'requestId', description: 'Friend request ID', type: String })
  @ApiBody({ type: AcceptFriendRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Friend request updated successfully',
    schema: {
      example: {
        id: 'request-uuid',
        senderId: 'sender-uuid',
        receiverId: 'receiver-uuid',
        status: 'accepted',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async acceptFriendRequest(
    @Request() req,
    @Param('requestId') requestId: string,
    @Body() acceptFriendRequestDto: AcceptFriendRequestDto
  ) {
    this.logger.log(`User ${req.user.id} accepting friend request: ${requestId}`);
    return await this.friendsService.acceptFriendRequest(
      req.user.id,
      requestId,
      acceptFriendRequestDto.status
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a friend from your friend list' })
  @ApiBearerAuth()
  @ApiParam({ name: 'userId', description: 'Friend user ID to remove', type: String })
  @ApiResponse({
    status: 200,
    description: 'Friend removed successfully',
    schema: {
      example: {
        message: 'Friend removed successfully'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Friend not found' })
  async removeFriend(
    @Request() req,
    @Param('userId') userId: string
  ) {
    this.logger.log(`User ${req.user.id} removing friend: ${userId}`);
    return await this.friendsService.removeFriend(req.user.id, userId);
  }
}