import { ApiProperty } from '@nestjs/swagger';
import { WalkResponseDto } from './walk-response.dto';

export class WalksListResponseDto {
  @ApiProperty({
    type: [WalkResponseDto],
    description: 'List of walks matching the criteria',
  })
  data: WalkResponseDto[];

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