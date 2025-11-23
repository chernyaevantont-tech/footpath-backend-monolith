import { IsString, IsOptional, IsArray, IsUUID, ArrayMinSize, ArrayMaxSize, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PathPlaceDto {
  @IsUUID()
  placeId: string;

  @IsNumber()
  @Min(0)
  order: number;

  @IsNumber()
  @Min(0)
  @Max(1440) // Max 24 hours in minutes
  timeAtPlace: number;
}

export class CreatePathDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(2) // A path needs at least 2 places
  @ArrayMaxSize(50) // Max 50 places in a path
  @ValidateNested({ each: true })
  @Type(() => PathPlaceDto)
  places: PathPlaceDto[];

  @IsOptional()
  @IsString()
  status?: string; // 'draft' or 'published'
}