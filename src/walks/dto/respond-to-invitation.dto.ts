import { IsEnum } from 'class-validator';
import { ParticipantStatus } from '../entities/walk-participant.entity';

export class RespondToInvitationDto {
  @IsEnum(ParticipantStatus)
  status: ParticipantStatus;
}