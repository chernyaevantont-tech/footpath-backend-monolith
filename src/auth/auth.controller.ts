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
  Logger,
  UseInterceptors,
  ClassSerializerInterceptor,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RegisterModeratorDto } from './dto/register-moderator.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { User, UserRole } from './entities/user.entity';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: RegisterResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request (email already exists, weak password, etc.)' })
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(`Register attempt for email: ${registerDto.email}`);
    const result = await this.authService.register(registerDto);
    this.logger.log(`User registered successfully with ID: ${result.user.id}`);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    type: LoginResponseDto
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    const result = await this.authService.login(loginDto);
    this.logger.log(`User logged in successfully with ID: ${result.user.id}`);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get authenticated user profile',
    security: [{ 'access-token': [] }]
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    this.logger.log(`Get profile request for user ID: ${req.user.id}`);
    return await this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBearerAuth()
  @ApiBody({ type: UserProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() userProfileDto: UserProfileDto) {
    this.logger.log(`Update profile request for user ID: ${req.user.id}`);
    const updatedUser = await this.authService.updateProfile(req.user.id, userProfileDto.email, userProfileDto.username);
    this.logger.log(`Profile updated successfully for user ID: ${req.user.id}`);
    return updatedUser;
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset request processed',
    schema: {
      example: {
        message: 'If an account with that email exists, a reset link has been sent.'
      }
    }
  })
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    this.logger.log(`Password reset request for email: ${requestPasswordResetDto.email}`);
    await this.authService.requestPasswordReset(requestPasswordResetDto);
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        message: 'Password has been reset successfully.'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    this.logger.log(`Password reset attempt with token: ${resetPasswordDto.token.substring(0, 8)}...`);
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password has been reset successfully.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('register-moderator')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin register a new moderator/admin user', operationId: 'registerModerator' })
  @ApiBearerAuth()
  @ApiBody({ type: RegisterModeratorDto })
  @ApiResponse({
    status: 201,
    description: 'Moderator/Admin registered successfully',
    type: RegisterResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can register moderators' })
  @ApiResponse({ status: 400, description: 'Bad request (email already exists, weak password, invalid role, etc.)' })
  @UsePipes(ValidationPipe)
  async registerModerator(@Body() registerModeratorDto: RegisterModeratorDto) {
    this.logger.log(`Admin register moderator attempt for email: ${registerModeratorDto.email} with role: ${registerModeratorDto.role}`);
    const result = await this.authService.registerModerator(registerModeratorDto);
    this.logger.log(`Moderator registered successfully with ID: ${result.user.id} and role: ${result.user.role}`);
    return result;
  }
}