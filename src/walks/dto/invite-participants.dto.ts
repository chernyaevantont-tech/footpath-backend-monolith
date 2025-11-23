import { IsUUID, IsArray } from 'class-validator';

export class InviteParticipantsDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  userIds: string[];
}