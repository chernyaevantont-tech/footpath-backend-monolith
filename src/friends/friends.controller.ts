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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { AcceptFriendRequestDto } from './dto/accept-friend-request.dto';
import { RemoveFriendDto } from './dto/remove-friend.dto';
import { FriendRequestStatus } from './entities/friend-request.entity';

@Controller('friends')
export class FriendsController {
  private readonly logger = new Logger(FriendsController.name);

  constructor(private readonly friendsService: FriendsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getFriends(@Request() req) {
    this.logger.log(`Getting friends for user: ${req.user.id}`);
    return await this.friendsService.getFriends(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
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
  async removeFriend(
    @Request() req,
    @Param('userId') userId: string
  ) {
    this.logger.log(`User ${req.user.id} removing friend: ${userId}`);
    return await this.friendsService.removeFriend(req.user.id, userId);
  }
}