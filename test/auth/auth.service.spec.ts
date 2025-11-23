import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';
import { User } from '../../src/auth/entities/user.entity';
import { PasswordResetToken } from '../../src/auth/entities/password-reset-token.entity';
import { RegisterDto } from '../../src/auth/dto/register.dto';
import { LoginDto } from '../../src/auth/dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from '../../src/auth/dto/password-reset.dto';
import { PasswordUtil } from '../../src/auth/utils/password.util';
import { TokenUtil } from '../../src/auth/utils/token.util';
import { RedisService } from '../../src/common/redis.service';

// Mock bcrypt
jest.mock('../../src/auth/utils/password.util');
// Mock token util
jest.mock('../../src/auth/utils/token.util');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let passwordResetTokenRepository: Repository<PasswordResetToken>;
  let jwtService: JwtService;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockPasswordResetTokenRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockRedisService = {
    getJson: jest.fn().mockResolvedValue(null), // Initially return null for cache misses
    setJson: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    exists: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: mockPasswordResetTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    passwordResetTokenRepository = module.get<Repository<PasswordResetToken>>(getRepositoryToken(PasswordResetToken));
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const newUser = {
        id: '1',
        email: registerDto.email,
        password: 'hashed_password',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      (userRepository.save as jest.Mock).mockResolvedValue(newUser);
      (PasswordUtil.hash as jest.Mock).mockResolvedValue('hashed_password');
      (jwtService.sign as jest.Mock).mockReturnValue('jwt_token');
      (mockConfigService.get as jest.Mock).mockReturnValue('default_secret');

      const result = await service.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: registerDto.email } });
      expect(PasswordUtil.hash).toHaveBeenCalledWith(registerDto.password);
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        email: registerDto.email,
        password: 'hashed_password',
      }));
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({ user: newUser, token: 'jwt_token' });
    });

    it('should throw BadRequestException if user already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue({
        id: '1',
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: registerDto.email } });
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const existingUser = {
        id: '1',
        email: loginDto.email,
        password: 'hashed_password',
        role: 'user',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(existingUser);
      (PasswordUtil.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('jwt_token');
      (mockConfigService.get as jest.Mock).mockReturnValue('default_secret');

      const result = await service.login(loginDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: loginDto.email } });
      expect(PasswordUtil.compare).toHaveBeenCalledWith(loginDto.password, 'hashed_password');
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({ user: existingUser, token: 'jwt_token' });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: loginDto.email } });
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const existingUser = {
        id: '1',
        email: loginDto.email,
        password: 'hashed_password',
        role: 'user',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(existingUser);
      (PasswordUtil.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: loginDto.email } });
      expect(PasswordUtil.compare).toHaveBeenCalledWith(loginDto.password, 'hashed_password');
    });
  });

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      const userId = '1';
      const newEmail = 'newemail@example.com';

      const existingUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashed_password',
        role: 'user',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(existingUser);
      (userRepository.save as jest.Mock).mockResolvedValue({
        ...existingUser,
        email: newEmail,
      });

      const result = await service.updateProfile(userId, newEmail);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(userRepository.save).toHaveBeenCalledWith({
        ...existingUser,
        email: newEmail,
      });
      expect(result.email).toBe(newEmail);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const userId = '1';
      const newEmail = 'newemail@example.com';

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.updateProfile(userId, newEmail)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
    });

    it('should throw BadRequestException if new email is already taken', async () => {
      const userId = '1';
      const newEmail = 'newemail@example.com';

      const existingUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashed_password',
        role: 'user',
      };

      const anotherUser = {
        id: '2',
        email: newEmail,
        password: 'hashed_password',
        role: 'user',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValueOnce(existingUser);
      (userRepository.findOne as jest.Mock).mockResolvedValueOnce(anotherUser);

      await expect(service.updateProfile(userId, newEmail)).rejects.toThrow(BadRequestException);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: newEmail } });
    });
  });

  describe('requestPasswordReset', () => {
    it('should create a password reset token if user exists', async () => {
      const email = 'test@example.com';
      const requestPasswordResetDto: RequestPasswordResetDto = { email };

      const user = {
        id: '1',
        email,
        password: 'hashed',
        role: 'user',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (TokenUtil.generateToken as jest.Mock).mockReturnValue('test_token');
      (passwordResetTokenRepository.delete as jest.Mock).mockResolvedValue(undefined);
      (passwordResetTokenRepository.save as jest.Mock).mockResolvedValue({
        token: 'test_token',
        userId: '1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      });

      await service.requestPasswordReset(requestPasswordResetDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(passwordResetTokenRepository.delete).toHaveBeenCalledWith({ userId: '1' });
      expect(passwordResetTokenRepository.save).toHaveBeenCalled();
    });

    it('should not reveal if user does not exist', async () => {
      const requestPasswordResetDto: RequestPasswordResetDto = { email: 'nonexistent@example.com' };

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.requestPasswordReset(requestPasswordResetDto)).resolves.not.toThrow();
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'nonexistent@example.com' } });
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'valid_token',
        password: 'new_password',
      };

      const resetToken = {
        token: 'valid_token',
        userId: '1',
        expiresAt: new Date(Date.now() + 60000), // 1 minute from now
        user: {
          id: '1',
          email: 'test@example.com',
          password: 'old_hashed',
          role: 'user',
        },
      };

      (passwordResetTokenRepository.findOne as jest.Mock).mockResolvedValue(resetToken);
      (PasswordUtil.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      (userRepository.save as jest.Mock).mockResolvedValue({
        ...resetToken.user,
        password: 'new_hashed_password',
      });

      await service.resetPassword(resetPasswordDto);

      expect(passwordResetTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: 'valid_token' },
        relations: ['user'],
      });
      expect(PasswordUtil.hash).toHaveBeenCalledWith('new_password');
      expect(userRepository.save).toHaveBeenCalledWith({
        ...resetToken.user,
        password: 'new_hashed_password',
      });
      expect(passwordResetTokenRepository.remove).toHaveBeenCalledWith(resetToken);
    });

    it('should throw BadRequestException for invalid token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'invalid_token',
        password: 'new_password',
      };

      (passwordResetTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'expired_token',
        password: 'new_password',
      };

      const expiredResetToken = {
        token: 'expired_token',
        userId: '1',
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
        user: {
          id: '1',
          email: 'test@example.com',
          password: 'old_hashed',
          role: 'user',
        },
      };

      (passwordResetTokenRepository.findOne as jest.Mock).mockResolvedValue(expiredResetToken);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      expect(passwordResetTokenRepository.remove).toHaveBeenCalledWith(expiredResetToken);
    });
  });
});