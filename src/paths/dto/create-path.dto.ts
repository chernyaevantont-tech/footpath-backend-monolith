import { IsString, IsOptional, IsArray, IsUUID, ArrayMinSize, ArrayMaxSize, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PathPlaceDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'UUID of the place in the path',
  })
  @IsUUID()
  placeId: string;

  @ApiProperty({
    example: 0,
    description: 'Order position of this place in the path',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiProperty({
    example: 60,
    description: 'Time to spend at this place in minutes',
    minimum: 0,
    maximum: 1440, // Max 24 hours in minutes
  })
  @IsNumber()
  @Min(0)
  @Max(1440) // Max 24 hours in minutes
  timeAtPlace: number;
}

export class CreatePathDto {
  @ApiProperty({
    example: 'Historic Downtown Walk',
    description: 'Name of the path',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'A scenic walk through the historic downtown area',
    description: 'Description of the path',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: [
      {
        placeId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        order: 0,
        timeAtPlace: 30
      },
      {
        placeId: 'b2c3d4e5-f678-9012-3456-7890abcdef12',
        order: 1,
        timeAtPlace: 60
      }
    ],
    description: 'Array of places in the path with their order and time spent',
  })
  @IsArray()
  @ArrayMinSize(2) // A path needs at least 2 places
  @ArrayMaxSize(50) // Max 50 places in a path
  @ValidateNested({ each: true })
  @Type(() => PathPlaceDto)
  places: PathPlaceDto[];

  @ApiPropertyOptional({
    example: 'draft',
    description: 'Status of the path (draft or published)',
  })
  @IsOptional()
  @IsString()
  status?: string; // 'draft' or 'published'
}