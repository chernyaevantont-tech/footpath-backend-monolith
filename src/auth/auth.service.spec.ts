import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordUtil } from './utils/password.util';

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserResponseDto } from './dto/user-response.dto';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: Partial<Repository<User>>;
  let mockPasswordResetTokenRepository: Partial<Repository<PasswordResetToken>>;
  let mockJwtService: Partial<JwtService>;
  let mockConfigService: Partial<ConfigService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockPasswordResetTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mockToken'),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test_secret';
        if (key === 'JWT_EXPIRES_IN') return '1d';
        return null;
      }),
    };

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw error if password is too short', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: '123',
      };

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'validPassword123',
      };

      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'validPassword123',
      };

      const hashedPassword = 'hashedPassword';
      jest.spyOn(PasswordUtil, 'hash').mockResolvedValue(hashedPassword);

      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockUserRepository.save as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        password: hashedPassword,
      });

      const result = await service.register(registerDto);

      expect(result.user.email).toBe(registerDto.email);
      expect(result.token).toBe('mockToken');
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw error if user does not exist', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error if password is invalid', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(PasswordUtil, 'compare').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should login user successfully', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'correctPassword',
      };

      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(PasswordUtil, 'compare').mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.user.email).toBe(mockUser.email);
      expect(result.token).toBe('mockToken');
    });
  });

  describe('getProfile', () => {
    it('should return user profile from database', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getProfile('1');

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.id).toBe(mockUser.id);
    });
  });

  describe('requestPasswordReset', () => {
    it('should not reveal if user exists when requesting reset', async () => {
      const requestPasswordResetDto = { email: 'nonexistent@example.com' };
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      await service.requestPasswordReset(requestPasswordResetDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: 'nonexistent@example.com' } });
      expect(mockPasswordResetTokenRepository.save).not.toHaveBeenCalled();
    });

    it('should create reset token for existing user', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      await service.requestPasswordReset({ email: 'test@example.com' });

      expect(mockPasswordResetTokenRepository.delete).toHaveBeenCalledWith({ userId: mockUser.id });
      expect(mockPasswordResetTokenRepository.save).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should throw error for invalid token', async () => {
      (mockPasswordResetTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.resetPassword({ token: 'invalid', password: 'newPassword' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error for expired token', async () => {
      const expiredToken = {
        token: 'expiredToken',
        userId: '1',
        expiresAt: new Date(Date.now() - 1000), // Past date
        user: mockUser,
      };
      (mockPasswordResetTokenRepository.findOne as jest.Mock).mockResolvedValue(expiredToken);

      await expect(service.resetPassword({ token: 'expiredToken', password: 'newPassword' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should reset password successfully for valid token', async () => {
      const validToken = {
        token: 'validToken',
        userId: '1',
        expiresAt: new Date(Date.now() + 10000), // Future date
        user: mockUser,
      };
      (mockPasswordResetTokenRepository.findOne as jest.Mock).mockResolvedValue(validToken);
      jest.spyOn(PasswordUtil, 'hash').mockResolvedValue('newHashedPassword');

      await service.resetPassword({ token: 'validToken', password: 'newPassword' });

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'newHashedPassword' })
      );
      expect(mockPasswordResetTokenRepository.remove).toHaveBeenCalledWith(validToken);
    });
  });
});