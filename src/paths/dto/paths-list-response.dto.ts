import { ApiProperty } from '@nestjs/swagger';
import { PathResponseDto } from './path-response.dto';

export class PathsListResponseDto {
  @ApiProperty({
    type: [PathResponseDto],
    description: 'List of paths matching the criteria',
  })
  data: PathResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    },
    description: 'Pagination metadata',
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}