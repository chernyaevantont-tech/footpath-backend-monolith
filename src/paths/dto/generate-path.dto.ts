import { IsString, IsOptional, IsArray, IsUUID, IsNumber, Min, Max, IsPositive, IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePathDto {
  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'UUID of the starting place',
  })
  @IsOptional()
  @IsUUID()
  startPlaceId?: string;

  @ApiPropertyOptional({
    example: 'b2c3d4e5-f678-9012-3456-7890abcdef12',
    description: 'UUID of the ending place',
  })
  @IsOptional()
  @IsUUID()
  endPlaceId?: string;

  @ApiPropertyOptional({
    example: 55.7558,
    description: 'Starting latitude coordinate',
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsLatitude()
  startLatitude?: number;

  @ApiPropertyOptional({
    example: 37.6173,
    description: 'Starting longitude coordinate',
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsLongitude()
  startLongitude?: number;

  @ApiPropertyOptional({
    example: 55.7584,
    description: 'Ending latitude coordinate',
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsLatitude()
  endLatitude?: number;

  @ApiPropertyOptional({
    example: 37.6156,
    description: 'Ending longitude coordinate',
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsLongitude()
  endLongitude?: number;

  @ApiPropertyOptional({
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef', 'b2c3d4e5-f678-9012-3456-7890abcdef12'],
    description: 'Array of place IDs that must be included in the path',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  includedPlaceIds?: string[];

  @ApiPropertyOptional({
    example: ['romantic', 'child-friendly', 'scenic'],
    description: 'Array of tags to filter places in the path',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    example: 120,
    description: 'Maximum duration of the path in minutes',
    minimum: 0,
  })
  @IsNumber()
  @IsPositive()
  maxDuration?: number; // Maximum duration in minutes

  @ApiProperty({
    example: 5,
    description: 'Maximum distance of the path in kilometers',
    minimum: 0,
  })
  @IsNumber()
  @IsPositive()
  maxDistance?: number; // Maximum distance in kilometers

  @ApiPropertyOptional({
    example: 'Romantic Evening Walk',
    description: 'Name for the generated path',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'An evening walk with romantic places',
    description: 'Description for the generated path',
  })
  @IsOptional()
  @IsString()
  description?: string;
}