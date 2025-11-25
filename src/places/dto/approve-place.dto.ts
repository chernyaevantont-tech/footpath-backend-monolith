import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApprovePlaceDto {
  @ApiPropertyOptional({
    example: 'This location is appropriate and has proper details',
    description: 'Reason for approving the place',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}