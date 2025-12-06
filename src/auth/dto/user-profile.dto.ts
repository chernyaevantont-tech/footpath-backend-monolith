import { IsEmail, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address for the user account',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'johndoe',
    description: 'Username for the user account (can be changed anytime, no uniqueness required)',
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Display name for the user account',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  name?: string;
}