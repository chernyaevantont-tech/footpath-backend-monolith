import { IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FriendRequestStatus } from '../entities/friend-request.entity';

export class AcceptFriendRequestDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'UUID of the friend request to accept',
  })
  @IsUUID()
  requestId: string;

  @ApiProperty({
    example: 'accepted',
    description: 'Status to set for the friend request',
    enum: FriendRequestStatus,
  })
  @IsEnum(FriendRequestStatus)
  status: FriendRequestStatus;
}