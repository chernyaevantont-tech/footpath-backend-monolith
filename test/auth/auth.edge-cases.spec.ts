import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../src/auth/auth.service';
import { User } from '../../src/auth/entities/user.entity';
import { PasswordResetToken } from '../../src/auth/entities/password-reset-token.entity';
import { RegisterDto } from '../../src/auth/dto/register.dto';
import { LoginDto } from '../../src/auth/dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from '../../src/auth/dto/password-reset.dto';
import { PasswordUtil } from '../../src/auth/utils/password.util';
import { TokenUtil } from '../../src/auth/utils/token.util';

// Mock bcrypt
jest.mock('../../src/auth/utils/password.util');
// Mock token util
jest.mock('../../src/auth/utils/token.util');

describe('Authentication Module Edge Cases', () => {
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    passwordResetTokenRepository = module.get<Repository<PasswordResetToken>>(getRepositoryToken(PasswordResetToken));
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('Register Edge Cases', () => {
    it('should handle registration with very long email', async () => {
      const longEmail = 'a'.repeat(254) + '@example.com';
      const registerDto: RegisterDto = {
        email: longEmail,
        password: 'validPassword123',
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
      (PasswordUtil.hash as jest.Mock).mockResolvedValue('hashed_password');
      (userRepository.save as jest.Mock).mockResolvedValue(newUser);
      (jwtService.sign as jest.Mock).mockReturnValue('jwt_token');
      (mockConfigService.get as jest.Mock).mockReturnValue('default_secret');

      await expect(service.register(registerDto)).resolves.not.toThrow();
    });

    it('should handle registration with special characters in password', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'P@ssw0rd!2023#$%',
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
      (PasswordUtil.hash as jest.Mock).mockResolvedValue('hashed_password');
      (userRepository.save as jest.Mock).mockResolvedValue(newUser);
      (jwtService.sign as jest.Mock).mockReturnValue('jwt_token');
      (mockConfigService.get as jest.Mock).mockReturnValue('default_secret');

      await expect(service.register(registerDto)).resolves.not.toThrow();
    });

    it('should fail registration with weak password', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: '123',
      };

      await expect(service.register(registerDto)).rejects.toThrow();
    });
  });

  describe('Login Edge Cases', () => {
    it('should handle login with SQL injection attempt in email', async () => {
      const loginDto: LoginDto = {
        email: "admin'; DROP TABLE users; --",
        password: 'any_password',
      };

      (userRepository.findOne as jest.Mock).mockImplementation(({ where }) => {
        // TypeORM would properly escape parameters, so the malicious input should be treated as a literal
        if (where.email === loginDto.email) {
          return Promise.resolve(null); // No user found
        }
        return Promise.resolve(null);
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle login with empty credentials', async () => {
      const loginDto: LoginDto = {
        email: '',
        password: '',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle login with null password', async () => {
      const loginDto: LoginDto = {
        email: 'user@example.com',
        password: null,
      };

      await expect(() => service.login(loginDto as any)).rejects.toThrow();
    });
  });

  describe('Profile Update Edge Cases', () => {
    it('should handle profile update with same email', async () => {
      const userId = '1';
      const sameEmail = 'existing@example.com';

      const existingUser = {
        id: userId,
        email: sameEmail,
        password: 'hashed_password',
        role: 'user',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(existingUser);
      (userRepository.save as jest.Mock).mockResolvedValue(existingUser);

      const result = await service.updateProfile(userId, sameEmail);

      expect(result.email).toBe(sameEmail);
    });

    it('should handle profile update with case-sensitive email', async () => {
      const userId = '1';
      const newEmail = 'NewEmail@Example.com';

      const existingUser = {
        id: userId,
        email: 'newemail@example.com',
        password: 'hashed_password',
        role: 'user',
      };

      const anotherUser = {
        id: '2',
        email: 'newemail@example.com', // lowercase version exists
        password: 'hashed',
        role: 'user',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValueOnce(existingUser);
      (userRepository.findOne as jest.Mock).mockResolvedValueOnce(null); // Different case shouldn't conflict
      (userRepository.save as jest.Mock).mockResolvedValue({
        ...existingUser,
        email: newEmail,
      });

      const result = await service.updateProfile(userId, newEmail);

      expect(result.email).toBe(newEmail);
    });
  });

  describe('Password Reset Edge Cases', () => {
    it('should handle multiple password reset requests for the same user', async () => {
      const email = 'user@example.com';
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

      // Make multiple requests
      await service.requestPasswordReset(requestPasswordResetDto);
      await service.requestPasswordReset(requestPasswordResetDto);
      await service.requestPasswordReset(requestPasswordResetDto);

      // Each call should delete old tokens and create a new one
      expect(passwordResetTokenRepository.delete).toHaveBeenCalledTimes(3);
      expect(passwordResetTokenRepository.save).toHaveBeenCalledTimes(3);
    });

    it('should handle password reset with empty token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: '',
        password: 'new_password',
      };

      (passwordResetTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle password reset with very long token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'a'.repeat(1000),
        password: 'new_password',
      };

      (passwordResetTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle password reset with same password as before', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'valid_token',
        password: 'same_old_password',
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

      expect(PasswordUtil.hash).toHaveBeenCalledWith('same_old_password');
      expect(userRepository.save).toHaveBeenCalledWith({
        ...resetToken.user,
        password: 'new_hashed_password',
      });
    });
  });

  describe('Token Expiration Edge Cases', () => {
    it('should handle token expiration exactly at expiry time', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'edge_case_token',
        password: 'new_password',
      };

      const expiryTime = new Date();
      const resetToken = {
        token: 'edge_case_token',
        userId: '1',
        expiresAt: expiryTime, // Exactly at current time
        user: {
          id: '1',
          email: 'test@example.com',
          password: 'old_hashed',
          role: 'user',
        },
      };

      (passwordResetTokenRepository.findOne as jest.Mock).mockResolvedValue(resetToken);

      // Slightly advance time so the token has expired
      jest.useFakeTimers();
      jest.setSystemTime(new Date(Date.now() + 1000)); // 1 second in the future

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      expect(passwordResetTokenRepository.remove).toHaveBeenCalledWith(resetToken);

      jest.useRealTimers();
    });

    it('should handle token that expires in the past', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'expired_token',
        password: 'new_password',
      };

      const resetToken = {
        token: 'expired_token',
        userId: '1',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        user: {
          id: '1',
          email: 'test@example.com',
          password: 'old_hashed',
          role: 'user',
        },
      };

      (passwordResetTokenRepository.findOne as jest.Mock).mockResolvedValue(resetToken);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      expect(passwordResetTokenRepository.remove).toHaveBeenCalledWith(resetToken);
    });
  });
});