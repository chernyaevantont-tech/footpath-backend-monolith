import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMaxSize, IsEnum, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaceStatus } from '../../entities/place.entity';

export class CoordinatesDto {
  @ApiProperty({
    example: 37.6173,
    description: 'Longitude coordinate of the place',
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    example: 55.7558,
    description: 'Latitude coordinate of the place',
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;
}

export class CreatePlaceDto {
  @ApiProperty({
    example: 'Central Park',
    description: 'Name of the place',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'A beautiful urban park in the center of the city',
    description: 'Description of the place',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: {
      latitude: 55.7558,
      longitude: 37.6173
    },
    description: 'Coordinates of the place',
  })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: CoordinatesDto;

  @ApiPropertyOptional({
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef', 'b2c3d4e5-f678-9012-3456-7890abcdef12'],
    description: 'Array of tag IDs to associate with the place (max 10)',
    maxItems: 10,
  })
  @IsArray()
  @ArrayMaxSize(10) // Limit to 10 tags
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}