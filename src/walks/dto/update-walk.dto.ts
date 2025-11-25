import { IsString, IsOptional, IsUUID, IsDateString, ValidateNested, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WalkStatus } from '../entities/walk.entity';

export class UpdateWalkDto {
  @ApiPropertyOptional({
    example: 'Updated Evening Stroll in the Park',
    description: 'Updated title of the walk',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'An updated description of the relaxing evening walk',
    description: 'Updated description of the walk',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Updated path ID for this walk',
  })
  @IsOptional()
  @IsUUID()
  pathId?: string;

  @ApiPropertyOptional({
    example: '2023-01-01T18:30:00.000Z',
    description: 'Updated start time of the walk',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    example: '2023-01-01T20:30:00.000Z',
    description: 'Updated end time of the walk',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    example: 'confirmed',
    description: 'Updated status of the walk',
    enum: WalkStatus,
  })
  @IsOptional()
  @IsEnum(WalkStatus)
  status?: WalkStatus;
}