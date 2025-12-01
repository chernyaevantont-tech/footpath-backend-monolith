import { ApiProperty } from '@nestjs/swagger';

export class TagResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Unique identifier of the tag',
  })
  id: string;

  @ApiProperty({
    example: 'Nature',
    description: 'Name of the tag',
  })
  name: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the tag was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the tag was last updated',
  })
  updatedAt: Date;
}