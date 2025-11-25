import { IsOptional, IsNumber, IsString, MaxLength, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetPlaceRecommendationsDto {
  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'UUID of the user to get recommendations for',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Maximum number of recommendations to return',
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'Moscow, Russia',
    description: 'Location context for recommendations (coordinates or area name)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string; // Could be coordinates or area name

  @ApiPropertyOptional({
    example: ['romantic', 'child-friendly', 'scenic'],
    description: 'Array of tags to filter recommendations',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class GetPathRecommendationsDto {
  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'UUID of the user to get recommendations for',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Maximum number of path recommendations to return',
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  limit?: number = 5;

  @ApiPropertyOptional({
    example: 'Moscow, Russia',
    description: 'Start location for path recommendations',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  startLocation?: string;

  @ApiPropertyOptional({
    example: 'Red Square, Moscow',
    description: 'End location for path recommendations',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  endLocation?: string;
}

export class GenerateEmbeddingDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the place to generate embedding for',
  })
  @IsString()
  placeId: string;

  @ApiProperty({
    example: 'Central Park',
    description: 'Name of the place',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'A beautiful urban park in the center of the city with walking paths and recreational areas',
    description: 'Description of the place',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: ['park', 'recreation', 'walking'],
    description: 'Array of tags associated with the place',
  })
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}