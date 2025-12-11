import { ApiProperty } from '@nestjs/swagger';
import { PathStatus } from '../entities/path.entity';
import { UserResponseDto } from '../../auth/dto/user-response.dto';
import { PathPlaceResponseDto } from './path-place-response.dto';

export class PathResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Unique identifier of the path',
  })
  id: string;

  @ApiProperty({
    example: 'Morning Walk',
    description: 'Name of the path',
  })
  name: string;

  @ApiProperty({
    example: 'A nice morning walk around the park',
    description: 'Description of the path',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: 3.5,
    description: 'Distance of the path in kilometers',
    type: 'number',
  })
  distance: number;

  @ApiProperty({
    example: 60,
    description: 'Total time of the path in minutes',
    type: 'number',
  })
  totalTime: number;

  @ApiProperty({
    example: PathStatus.PUBLISHED,
    enum: PathStatus,
    description: 'Status of the path',
  })
  status: PathStatus;

  @ApiProperty({
    example: false,
    description: 'Whether the path is circular (returns to start)',
  })
  isCircular: boolean;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the user who created the path',
    nullable: true,
  })
  creatorId: string | null;

  @ApiProperty({
    type: UserResponseDto,
    description: 'User who created the path',
  })
  creator: UserResponseDto;

  @ApiProperty({
    type: [PathPlaceResponseDto],
    description: 'List of places in the path',
  })
  pathPlaces: PathPlaceResponseDto[];

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the path was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the path was last updated',
  })
  updatedAt: Date;

  @ApiProperty({
    example: {
      type: 'LineString',
      coordinates: [
        [37.6173, 55.7558],
        [37.6175, 55.7560],
        [37.6180, 55.7565],
      ],
    },
    description: 'GeoJSON LineString representing the route geometry',
    nullable: true,
  })
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  } | null;

  @ApiProperty({
    example: [
      {
        instruction: 'Head north on Main Street',
        distance: 150,
        duration: 120,
        maneuver: {
          type: 'turn',
          modifier: 'left',
          location: [37.6173, 55.7558],
        },
      },
    ],
    description: 'Step-by-step navigation instructions',
    nullable: true,
    required: false,
  })
  steps?: NavigationStep[] | null;
}

export interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
}