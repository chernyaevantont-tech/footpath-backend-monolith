import { IsString, IsOptional, IsArray, ArrayMaxSize, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCoordinatesDto {
  @ApiPropertyOptional({
    example: 37.6173,
    description: 'New longitude coordinate of the place',
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    example: 55.7558,
    description: 'New latitude coordinate of the place',
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()2
  @Min(-90)
  @Max(90)
  latitude: number;
}

export class UpdatePlaceDto {
  @ApiPropertyOptional({
    example: 'Updated Central Park',
    description: 'New name of the place',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'An updated description of the beautiful urban park',
    description: 'New description of the place',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: {
      latitude: 55.7558,
      longitude: 37.6173
    },
    description: 'New coordinates of the place',
  })
  @ValidateNested()
  @Type(() => UpdateCoordinatesDto)
  @IsOptional()
  coordinates?: UpdateCoordinatesDto;

  @ApiPropertyOptional({
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef', 'b2c3d4e5-f678-9012-3456-7890abcdef12'],
    description: 'Updated array of tag IDs to associate with the place (max 10)',
    maxItems: 10,
  })
  @IsArray()
  @ArrayMaxSize(10) // Limit to 10 tags
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}