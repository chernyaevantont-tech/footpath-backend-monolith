import { IsString, IsOptional, IsArray, IsEnum, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaceStatus } from '../../entities/place.entity';

class LocationFilterDto {
  @ApiProperty({
    example: 55.7558,
    description: 'Latitude coordinate for location-based search',
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    example: 37.6173,
    description: 'Longitude coordinate for location-based search',
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    example: 1000,
    description: 'Radius in meters for location-based search',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  radius: number; // radius in meters
}

export class PlaceFilterDto {
  @ApiPropertyOptional({
    example: 'Central Park',
    description: 'Filter places by name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef', 'b2c3d4e5-f678-9012-3456-7890abcdef12'],
    description: 'Filter places by tag IDs',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({
    example: 'approved',
    description: 'Filter places by status',
    enum: PlaceStatus,
  })
  @IsEnum(PlaceStatus)
  @IsOptional()
  status?: PlaceStatus;

  @ApiPropertyOptional({
    example: {
      latitude: 55.7558,
      longitude: 37.6173,
      radius: 1000
    },
    description: 'Location-based filter parameters',
  })
  @ValidateNested()
  @Type(() => LocationFilterDto)
  @IsOptional()
  location?: LocationFilterDto;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}