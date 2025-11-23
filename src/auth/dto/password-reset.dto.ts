import { IsEmail, IsString, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  token: string;
}