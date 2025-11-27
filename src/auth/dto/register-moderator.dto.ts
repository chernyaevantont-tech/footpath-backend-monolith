import { IsEmail, IsString, IsEnum, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class RegisterModeratorDto {
  @ApiProperty({
    example: 'moderator@example.com',
    description: 'Email address for the new moderator/admin account',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'Password for the moderator/admin account',
    minLength: 6,
    maxLength: 128,
  })
  @IsString()
  @Length(6, 128)
  password: string;

  @ApiProperty({
    example: 'moderator',
    description: 'Role for the new user (moderator or admin)',
    enum: UserRole,
    enumName: 'UserRole',
  })
  @IsEnum(UserRole)
  role: UserRole;
}