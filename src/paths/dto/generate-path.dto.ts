import { IsString, IsOptional, IsArray, IsUUID, IsNumber, Min, Max, IsPositive, IsLatitude, IsLongitude } from 'class-validator';

export class GeneratePathDto {
  @IsOptional()
  @IsUUID()
  startPlaceId?: string;

  @IsOptional()
  @IsUUID()
  endPlaceId?: string;

  @IsOptional()
  @IsLatitude()
  startLatitude?: number;

  @IsOptional()
  @IsLongitude()
  startLongitude?: number;

  @IsOptional()
  @IsLatitude()
  endLatitude?: number;

  @IsOptional()
  @IsLongitude()
  endLongitude?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  includedPlaceIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsNumber()
  @IsPositive()
  maxDuration?: number; // Maximum duration in minutes

  @IsNumber()
  @IsPositive()
  maxDistance?: number; // Maximum distance in kilometers

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}