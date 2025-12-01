import { ApiProperty } from '@nestjs/swagger';
import { PlaceResponseDto } from '../place/place-response.dto';

export class PlaceFilterResponseDto {
  @ApiProperty({
    type: [PlaceResponseDto],
    description: 'List of places matching the filter criteria',
  })
  data: PlaceResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 25,
      pages: 3,
    },
    description: 'Metadata about the pagination and total results',
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}