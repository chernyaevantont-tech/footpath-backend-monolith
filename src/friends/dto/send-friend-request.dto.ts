import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { FriendRequestStatus } from '../entities/friend-request.entity';

export class SendFriendRequestDto {
  @IsUUID()
  receiverId: string;
}