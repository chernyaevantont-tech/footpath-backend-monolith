import { ApiProperty } from '@nestjs/swagger';
import { WalkStatus } from '../entities/walk.entity';
import { UserResponseDto } from '../../auth/dto/user-response.dto';
import { WalkParticipantResponseDto } from './walk-participant-response.dto';

export class WalkResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Unique identifier of the walk',
  })
  id: string;

  @ApiProperty({
    example: 'Morning Walk',
    description: 'Title of the walk',
  })
  title: string;

  @ApiProperty({
    example: 'A nice morning walk around the park',
    description: 'Description of the walk',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the path associated with this walk',
    nullable: true,
  })
  pathId: string | null;

  @ApiProperty({
    example: '2023-01-01T10:00:00.000Z',
    description: 'Start time of the walk',
    nullable: true,
  })
  startTime: Date | null;

  @ApiProperty({
    example: '2023-01-01T11:00:00.000Z',
    description: 'End time of the walk',
    nullable: true,
  })
  endTime: Date | null;

  @ApiProperty({
    example: WalkStatus.PLANNED,
    enum: WalkStatus,
    description: 'Current status of the walk',
  })
  status: WalkStatus;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the user who created the walk',
  })
  creatorId: string;

  @ApiProperty({
    type: UserResponseDto,
    description: 'User who created the walk',
  })
  creator: UserResponseDto;

  @ApiProperty({
    type: [WalkParticipantResponseDto],
    description: 'List of participants in the walk',
  })
  participants: WalkParticipantResponseDto[];

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the walk was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the walk was last updated',
  })
  updatedAt: Date;
}