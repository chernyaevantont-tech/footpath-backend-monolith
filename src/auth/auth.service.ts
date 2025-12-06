import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RegisterModeratorDto } from './dto/register-moderator.dto';
import { PasswordUtil } from './utils/password.util';
import { TokenUtil } from './utils/token.util';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RedisService } from '../common/redis.service';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  // Helper method to convert User entity to UserResponseDto
  private entityToDto(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.username = user.username;
    dto.role = user.role;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }

  async register(registerDto: RegisterDto): Promise<{ user: UserResponseDto; token: string }> {
    const { email, password } = registerDto;

    // Validate password strength
    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hash(password);

    // Create new user
    const user = new User();
    user.email = email;
    user.password = hashedPassword;

    const savedUser = await this.userRepository.save(user);

    // Generate JWT token
    const token = this.generateToken(savedUser);

    // Convert to DTO
    const userDto = this.entityToDto(savedUser);

    return { user: userDto, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: UserResponseDto; token: string }> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await PasswordUtil.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Store session information in Redis
    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      loginTime: new Date().toISOString(),
    };

    // Use the JWT as the session key (we can extract user ID from the token)
    // For session caching, we'll create a separate key for the session data
    const sessionId = `session:${user.id}`;
    const sessionTtl = 24 * 60 * 60; // 24 hours in seconds
    await this.redisService.setJson(sessionId, sessionData, sessionTtl);

    this.logger.log(`Session created for user ${user.id}, stored in Redis with TTL ${sessionTtl}s`);

    // Convert to DTO
    const userDto = this.entityToDto(user);

    return { user: userDto, token };
  }

  async validateUser(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  private generateToken(user: User): string {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'default_secret',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '1d',
    });
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    // Try to get user data from cache first
    const cacheKey = `user:profile:${userId}`;
    const cachedUser = await this.redisService.getJson(cacheKey);

    if (cachedUser) {
      this.logger.log(`Cache hit for user profile: ${userId}`);
      // Convert cached entity to DTO
      return this.entityToDto(cachedUser);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'role', 'createdAt', 'updatedAt'],
    });

    // Cache the user profile for 1 hour
    if (user) {
      await this.redisService.setJson(cacheKey, user, 3600);
      return this.entityToDto(user);
    }

    return null;
  }

  async getSessionData(userId: string): Promise<any | null> {
    const sessionId = `session:${userId}`;
    const sessionData = await this.redisService.getJson(sessionId);

    if (sessionData) {
      this.logger.log(`Session retrieved from Redis for user: ${userId}`);
      return sessionData;
    }

    this.logger.log(`No session found in Redis for user: ${userId}`);
    return null;
  }

  async updateProfile(userId: string, email: string, username?: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if the new email is already taken by another user (different from current user)
    if (user.email !== email) {
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Email is already taken by another user');
      }
      user.email = email;
    }

    // Update username if provided
    if (username !== undefined) {
      user.username = username;
    }

    const updatedUser = await this.userRepository.save(user);

    // Clear the cached profile
    const cacheKey = `user:profile:${userId}`;
    await this.redisService.del(cacheKey);

    return this.entityToDto(updatedUser);
  }

  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto): Promise<void> {
    const { email } = requestPasswordResetDto;

    // Find user by email
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if user exists to prevent email enumeration
      return;
    }

    // Remove any existing reset tokens for this user
    await this.passwordResetTokenRepository.delete({ userId: user.id });

    // Create a new reset token (valid for 1 hour)
    const token = TokenUtil.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    const resetToken = new PasswordResetToken();
    resetToken.token = token;
    resetToken.userId = user.id;
    resetToken.expiresAt = expiresAt;

    await this.passwordResetTokenRepository.save(resetToken);

    // In a real application, you would send an email here with the reset token
    // For now, we'll just log it for demonstration
    this.logger.log(`Password reset token generated for user ${user.id}: ${token}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password } = resetPasswordDto;

    // Find the reset token
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if the token has expired
    if (resetToken.expiresAt < new Date()) {
      await this.passwordResetTokenRepository.remove(resetToken);
      throw new BadRequestException('Reset token has expired');
    }

    // Hash the new password
    const hashedPassword = await PasswordUtil.hash(password);

    // Update the user's password
    const user = resetToken.user;
    user.password = hashedPassword;
    await this.userRepository.save(user);

    // Remove the used reset token
    await this.passwordResetTokenRepository.remove(resetToken);

    // Clear the cached profile after password change
    const cacheKey = `user:profile:${user.id}`;
    await this.redisService.del(cacheKey);

    this.logger.log(`Password reset completed for user ${user.id}`);
  }

  async registerModerator(registerModeratorDto: RegisterModeratorDto): Promise<{ user: UserResponseDto; token: string }> {
    const { email, password, role } = registerModeratorDto;

    // Validate that the role is either MODERATOR or ADMIN
    if (role !== UserRole.MODERATOR && role !== UserRole.ADMIN) {
      throw new BadRequestException('Role must be either "moderator" or "admin"');
    }

    // Validate password strength
    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hash(password);

    // Create new user with specified role
    const user = new User();
    user.email = email;
    user.password = hashedPassword;
    user.role = role;

    const savedUser = await this.userRepository.save(user);

    // Generate JWT token
    const token = this.generateToken(savedUser);

    // Convert to DTO
    const userDto = this.entityToDto(savedUser);

    return { user: userDto, token };
  }

  async logout(userId: string): Promise<boolean> {
    // Remove session from Redis
    const sessionId = `session:${userId}`;
    const deleted = await this.redisService.del(sessionId);

    if (deleted) {
      this.logger.log(`Session deleted for user ${userId}`);
    } else {
      this.logger.log(`No session found to delete for user ${userId}`);
    }

    return deleted;
  }
}