import { IsString, IsOptional, IsUUID, IsDateString, ValidateNested, IsEnum, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { WalkStatus } from '../entities/walk.entity';

export class CreateWalkDto {
  @IsString()
  title: string;

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

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  inviteeIds?: string[];
}