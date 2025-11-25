import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FriendRequestStatus } from '../entities/friend-request.entity';

export class SendFriendRequestDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'UUID of the user receiving the friend request',
  })
  @IsUUID()
  receiverId: string;
}