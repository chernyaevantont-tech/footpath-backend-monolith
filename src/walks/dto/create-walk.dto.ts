import { IsString, IsOptional, IsUUID, IsDateString, ValidateNested, IsEnum, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalkStatus } from '../entities/walk.entity';

export class CreateWalkDto {
  @ApiProperty({
    example: 'Evening Stroll in the Park',
    description: 'Title of the walk',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'A relaxing evening walk with friends',
    description: 'Description of the walk',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the path for this walk',
  })
  @IsOptional()
  @IsUUID()
  pathId?: string;

  @ApiPropertyOptional({
    example: '2023-01-01T18:00:00.000Z',
    description: 'Start time of the walk',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    example: '2023-01-01T20:00:00.000Z',
    description: 'End time of the walk',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    example: 'planned',
    description: 'Status of the walk',
    enum: WalkStatus,
  })
  @IsOptional()
  @IsEnum(WalkStatus)
  status?: WalkStatus;

  @ApiPropertyOptional({
    example: ['b2c3d4e5-f678-9012-3456-7890abcdef12', 'c3d4e5f6-7890-1234-5678-90abcdef123'],
    description: 'Array of user IDs to invite to the walk',
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  inviteeIds?: string[];
}