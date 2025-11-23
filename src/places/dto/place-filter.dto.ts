import { IsString, IsOptional, IsArray, IsEnum, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PlaceStatus } from '../entities/place.entity';

class LocationFilterDto {
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
  radius: number; // radius in meters
}

export class PlaceFilterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];

  @IsEnum(PlaceStatus)
  @IsOptional()
  status?: PlaceStatus;

  @ValidateNested()
  @Type(() => LocationFilterDto)
  @IsOptional()
  location?: LocationFilterDto;

  @IsNumber()
  @Min(0)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}