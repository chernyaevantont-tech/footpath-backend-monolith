import { ApiProperty } from '@nestjs/swagger';
import { FriendRequestStatus } from '../entities/friend-request.entity';

export class SendFriendRequestResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Unique identifier of the friend request',
  })
  requestId: string;

  @ApiProperty({
    example: 'b1c2d3e4-f5g6-7890-1234-567890abcdef',
    description: 'ID of the user who sent the friend request',
  })
  senderId: string;

  @ApiProperty({
    example: 'johndoe',
    description: 'Username of the user who sent the friend request',
    nullable: true,
  })
  senderUsername: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Email of the user who sent the friend request',
  })
  senderEmail: string;

  @ApiProperty({
    example: 'c1d2e3f4-g5h6-7890-1234-567890abcdef',
    description: 'ID of the user who received the friend request',
  })
  receiverId: string;

  @ApiProperty({
    example: FriendRequestStatus.PENDING,
    enum: FriendRequestStatus,
    description: 'Status of the friend request',
  })
  status: FriendRequestStatus;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the friend request was created',
  })
  createdAt: string;
}