import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMaxSize, IsEnum, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PlaceStatus } from '../entities/place.entity';

export class CoordinatesDto {
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;
}

export class CreatePlaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: CoordinatesDto;

  @IsArray()
  @ArrayMaxSize(10) // Limit to 10 tags
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}