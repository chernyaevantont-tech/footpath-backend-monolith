import { IsString, IsOptional } from 'class-validator';

export class ApprovePlaceDto {
  @IsString()
  @IsOptional()
  reason?: string;
}