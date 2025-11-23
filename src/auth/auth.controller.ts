import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './entities/user.entity';
import { UserProfileDto } from './dto/user-profile.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(`Register attempt for email: ${registerDto.email}`);
    const result = await this.authService.register(registerDto);
    this.logger.log(`User registered successfully with ID: ${result.user.id}`);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    const result = await this.authService.login(loginDto);
    this.logger.log(`User logged in successfully with ID: ${result.user.id}`);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req) {
    this.logger.log(`Get profile request for user ID: ${req.user.userId}`);
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Request() req, @Body() userProfileDto: UserProfileDto) {
    this.logger.log(`Update profile request for user ID: ${req.user.userId}`);
    const updatedUser = await this.authService.updateProfile(req.user.userId, userProfileDto.email);
    this.logger.log(`Profile updated successfully for user ID: ${req.user.userId}`);
    return { message: 'Profile updated successfully', user: updatedUser };
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    this.logger.log(`Password reset request for email: ${requestPasswordResetDto.email}`);
    await this.authService.requestPasswordReset(requestPasswordResetDto);
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    this.logger.log(`Password reset attempt with token: ${resetPasswordDto.token.substring(0, 8)}...`);
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password has been reset successfully.' };
  }
}