import { IsString, IsOptional, IsArray, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteWalkDto {
  // Additional data that might be collected when completing a walk
  // e.g., actual start/end times, feedback, photos, etc.
  @ApiPropertyOptional({
    example: 'Had a great time with the group! The weather was perfect.',
    description: 'Additional notes about the completed walk activity',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  activityNotes?: string;

  @ApiPropertyOptional({
    example: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    description: 'URLs of photos taken during the walk',
  })
  @IsArray()
  @IsUrl({ require_protocol: true }, { each: true })
  @IsOptional()
  photoUrls?: string[];
}