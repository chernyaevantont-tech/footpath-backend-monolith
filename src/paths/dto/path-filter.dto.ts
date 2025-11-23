import { IsString, IsOptional, IsArray, IsUUID, IsNumber, Min, IsEnum, Max } from 'class-validator';
import { PathStatus } from '../entities/path.entity';

export class PathFilterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  creatorId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  placeIds?: string[];

  @IsOptional()
  @IsEnum(PathStatus)
  status?: PathStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}