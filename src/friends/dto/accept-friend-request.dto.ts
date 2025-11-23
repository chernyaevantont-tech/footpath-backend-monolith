import { IsUUID, IsEnum } from 'class-validator';
import { FriendRequestStatus } from '../entities/friend-request.entity';

export class AcceptFriendRequestDto {
  @IsUUID()
  requestId: string;
  
  @IsEnum(FriendRequestStatus)
  status: FriendRequestStatus;
}