import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';
import { PasswordUtil } from './utils/password.util';
import { TokenUtil } from './utils/token.util';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: User; token: string }> {
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

    return { user: savedUser, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
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

    return { user, token };
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

  async getProfile(userId: string): Promise<User> {
    return await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'role', 'createdAt', 'updatedAt'],
    });
  }

  async updateProfile(userId: string, email: string): Promise<User> {
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

    return await this.userRepository.save(user);
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

    this.logger.log(`Password reset completed for user ${user.id}`);
  }
}