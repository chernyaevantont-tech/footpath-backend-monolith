import { ApiProperty } from '@nestjs/swagger';
import { PlaceResponseDto } from '../../places/dto/place/place-response.dto';

export class PathPlaceResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the path this place belongs to',
  })
  pathId: string;

  @ApiProperty({
    example: 'b1c2d3e4-f5g6-7890-1234-567890abcdef',
    description: 'ID of the place in the path',
  })
  placeId: string;

  @ApiProperty({
    example: 1,
    description: 'Order of the place in the path',
    type: 'number',
  })
  order: number;

  @ApiProperty({
    example: 15,
    description: 'Time to spend at this place in minutes',
    type: 'number',
  })
  timeSpent: number;

  @ApiProperty({
    type: PlaceResponseDto,
    description: 'Details of the place in the path',
  })
  place: PlaceResponseDto;
}