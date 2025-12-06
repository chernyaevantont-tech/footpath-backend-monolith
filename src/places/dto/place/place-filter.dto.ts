import { IsString, IsOptional, IsArray, IsEnum, ValidateNested, IsNumber, Min, Max, Validate, IsObject } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaceStatus } from '../../entities/place.entity';

export class LocationFilterDto {
  @ApiProperty({
    example: 55.7558,
    description: 'Latitude coordinate for location-based search',
    minimum: -90,
    maximum: 90,
  })
  @Type(() => Number)
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
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    example: 1000,
    description: 'Radius in meters for location-based search',
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  radius: number; // radius in meters
}

// Alternative location DTO to handle lat/lng format
class AltLocationFilterDto {
  @ApiProperty({
    example: 55.7558,
    description: 'Latitude coordinate for location-based search',
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({
    example: 37.6173,
    description: 'Longitude coordinate for location-based search',
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({
    example: 1000,
    description: 'Radius in meters for location-based search',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  radius: number; // radius in meters
}

export function parseLocation(value: any): LocationFilterDto | undefined {
  if (!value) return undefined;

  let parsedValue;

  if (typeof value === 'string') {
    try {
      parsedValue = JSON.parse(value);
    } catch (e) {
      return undefined;
    }
  } else if (typeof value === 'object') {
    parsedValue = value;
  } else {
    return undefined;
  }

  // Convert lat/lng to latitude/longitude if needed
  if (parsedValue && typeof parsedValue === 'object') {
    const result: any = { ...parsedValue };

    // Map lat to latitude if present
    if ('lat' in result) {
      result.latitude = result.lat;
      delete result.lat;
    }

    // Map lng to longitude if present
    if ('lng' in result) {
      result.longitude = result.lng;
      delete result.lng;
    }

    return result as LocationFilterDto;
  }

  return undefined;
}

// Custom validator that handles both validation and transformation
export class LocationFilterValidator {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Min(0)
  radius: number;
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
    description: 'Location-based filter parameters (accepts lat/lng or latitude/longitude)',
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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page (use 0 for no limit)',
    minimum: 0,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Filter places by creator ID',
  })
  @IsString()
  @IsOptional()
  creatorId?: string;
}