import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { RegisterDto } from '../../src/auth/dto/register.dto';
import { LoginDto } from '../../src/auth/dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from '../../src/auth/dto/password-reset.dto';
import { UserProfileDto } from '../../src/auth/dto/user-profile.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResult = {
        user: { id: '1', email: 'test@example.com' },
        token: 'jwt_token',
      };

      (authService.register as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResult = {
        user: { id: '1', email: 'test@example.com' },
        token: 'jwt_token',
      };

      (authService.login as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getProfile', () => {
    it('should return user profile from JWT token', async () => {
      const mockRequest = {
        user: { userId: '1', email: 'test@example.com' },
      };

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockRequest.user);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockRequest = {
        user: { userId: '1', email: 'test@example.com' },
      };

      const userProfileDto: UserProfileDto = {
        email: 'newemail@example.com',
      };

      const mockResult = {
        user: { id: '1', email: 'newemail@example.com' },
      };

      (authService.updateProfile as jest.Mock).mockResolvedValue(mockResult.user);

      const result = await controller.updateProfile(mockRequest, userProfileDto);

      expect(authService.updateProfile).toHaveBeenCalledWith('1', userProfileDto.email);
      expect(result).toEqual({
        message: 'Profile updated successfully',
        user: mockResult.user,
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset', async () => {
      const requestPasswordResetDto: RequestPasswordResetDto = {
        email: 'test@example.com',
      };

      (authService.requestPasswordReset as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.requestPasswordReset(requestPasswordResetDto);

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(requestPasswordResetDto);
      expect(result).toEqual({ 
        message: 'If an account with that email exists, a reset link has been sent.' 
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'reset_token',
        password: 'new_password',
      };

      (authService.resetPassword as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(result).toEqual({ 
        message: 'Password has been reset successfully.' 
      });
    });
  });
});