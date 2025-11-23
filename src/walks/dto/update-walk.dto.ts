import { IsString, IsOptional, IsUUID, IsDateString, ValidateNested, IsEnum } from 'class-validator';
import { WalkStatus } from '../entities/walk.entity';

export class UpdateWalkDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  pathId?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsEnum(WalkStatus)
  status?: WalkStatus;
}