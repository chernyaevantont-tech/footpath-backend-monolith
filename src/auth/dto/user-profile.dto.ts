import { IsEmail, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UserProfileDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  name?: string;
}