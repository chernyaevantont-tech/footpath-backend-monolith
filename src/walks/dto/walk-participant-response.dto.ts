import { ApiProperty } from '@nestjs/swagger';
import { ParticipantStatus } from '../entities/walk-participant.entity';
import { UserResponseDto } from '../../auth/dto/user-response.dto';

export class WalkParticipantResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the walk this participant belongs to',
  })
  walkId: string;

  @ApiProperty({
    example: 'b1c2d3e4-f5g6-7890-1234-567890abcdef',
    description: 'ID of the user participating in the walk',
  })
  userId: string;

  @ApiProperty({
    example: ParticipantStatus.CONFIRMED,
    enum: ParticipantStatus,
    description: 'Status of the participant in the walk',
  })
  status: ParticipantStatus;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the participant joined the walk',
    nullable: true,
  })
  joinedAt: Date | null;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the participant responded to the invitation',
    nullable: true,
  })
  respondedAt: Date | null;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the participant record was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: true,
    description: 'Whether the participant attended the walk',
    nullable: true,
  })
  attended: boolean | null;

  @ApiProperty({
    type: UserResponseDto,
    description: 'User information of the participant',
  })
  user: UserResponseDto;
}