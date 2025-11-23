import { IsOptional, IsNumber, IsString, MaxLength, IsArray } from 'class-validator';

export class GetPlaceRecommendationsDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string; // Could be coordinates or area name

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class GetPathRecommendationsDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsNumber()
  limit?: number = 5;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  startLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  endLocation?: string;
}

export class GenerateEmbeddingDto {
  @IsString()
  placeId: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}