import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ParticipantStatus } from '../entities/walk-participant.entity';

export class RespondToInvitationDto {
  @ApiProperty({
    example: 'confirmed',
    description: 'Response to the walk invitation',
    enum: ParticipantStatus,
  })
  @IsEnum(ParticipantStatus)
  status: ParticipantStatus;
}