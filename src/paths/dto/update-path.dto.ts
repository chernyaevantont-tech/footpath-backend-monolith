import { IsString, IsOptional, IsArray, IsUUID, ArrayMinSize, ArrayMaxSize, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PathPlaceDto } from './create-path.dto';

export class UpdatePathDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2) // A path needs at least 2 places
  @ArrayMaxSize(50) // Max 50 places in a path
  @ValidateNested({ each: true })
  @Type(() => PathPlaceDto)
  places?: PathPlaceDto[];
}