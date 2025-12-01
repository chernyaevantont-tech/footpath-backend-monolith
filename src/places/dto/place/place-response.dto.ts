import { ApiProperty } from '@nestjs/swagger';
import { PlaceStatus } from '../../entities/place.entity';
import { TagResponseDto } from '../tag/tag-response.dto';

export class PlaceResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Unique identifier of the place',
  })
  id: string;

  @ApiProperty({
    example: 'Central Park',
    description: 'Name of the place',
  })
  name: string;

  @ApiProperty({
    example: 'A beautiful urban park in the center of the city',
    description: 'Description of the place',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: '0101000020E6100000E17A14AE474145C08E9D908EC2434340',
    description: 'Geometry coordinates in WKT format',
  })
  coordinates: string;

  @ApiProperty({
    example: PlaceStatus.APPROVED,
    enum: PlaceStatus,
    description: 'Current status of the place',
  })
  status: PlaceStatus;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the user who created the place',
    nullable: true,
  })
  creatorId: string | null;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the moderator who reviewed the place',
    nullable: true,
  })
  moderatorId: string | null;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the place was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the place was last updated',
  })
  updatedAt: Date;

  @ApiProperty({
    type: [TagResponseDto],
    description: 'List of tags associated with the place',
  })
  tags: TagResponseDto[];
}