import { IsString, IsOptional, IsArray, ArrayMaxSize, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCoordinatesDto {
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;
}

export class UpdatePlaceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateNested()
  @Type(() => UpdateCoordinatesDto)
  @IsOptional()
  coordinates?: UpdateCoordinatesDto;

  @IsArray()
  @ArrayMaxSize(10) // Limit to 10 tags
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}