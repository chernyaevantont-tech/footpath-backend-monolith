import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { Notification } from '../../src/notifications/entities/notification.entity';
import { User } from '../../src/auth/entities/user.entity';
import { CreateNotificationDto, BulkReadNotificationsDto } from '../../src/notifications/dto/notification.dto';
import { NotificationType } from '../../src/notifications/entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: Repository<Notification>;
  let userRepository: Repository<User>;

  const mockNotificationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get<Repository<Notification>>(getRepositoryToken(Notification));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should successfully create a notification', async () => {
      const createNotificationDto: CreateNotificationDto = {
        userId: '1',
        type: NotificationType.FRIEND_REQUEST,
        title: 'New friend request',
        message: 'John wants to be your friend',
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedNotification = {
        id: 'notification-1',
        ...createNotificationDto,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (notificationRepository.save as jest.Mock).mockResolvedValue(savedNotification);

      const result = await service.createNotification(createNotificationDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: createNotificationDto.userId } });
      expect(notificationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        userId: createNotificationDto.userId,
        type: createNotificationDto.type,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        isRead: false,
      }));
      expect(result).toEqual(savedNotification);
    });

    it('should throw BadRequestException if user not found', async () => {
      const createNotificationDto: CreateNotificationDto = {
        userId: 'nonexistent',
        type: NotificationType.FRIEND_REQUEST,
        title: 'New friend request',
        message: 'John wants to be your friend',
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.createNotification(createNotificationDto)).rejects.toThrow(BadRequestException);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: createNotificationDto.userId } });
    });
  });

  describe('getUserNotifications', () => {
    it('should return all notifications for a user', async () => {
      const userId = '1';
      const mockNotifications = [
        {
          id: 'notification-1',
          userId,
          type: NotificationType.FRIEND_REQUEST,
          title: 'New friend request',
          message: 'John wants to be your friend',
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'notification-2',
          userId,
          type: NotificationType.WALK_INVITATION,
          title: 'Walk invitation',
          message: 'Jane invited you to a walk',
          isRead: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (notificationRepository.find as jest.Mock).mockResolvedValue(mockNotifications);

      const result = await service.getUserNotifications(userId);

      expect(notificationRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notificationId = 'notification-1';
      const userId = '1';
      const mockNotification = {
        id: notificationId,
        userId,
        type: NotificationType.FRIEND_REQUEST,
        title: 'New friend request',
        message: 'John wants to be your friend',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationRepository.findOne as jest.Mock).mockResolvedValue(mockNotification);
      (notificationRepository.save as jest.Mock).mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await service.markAsRead(notificationId, userId);

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: notificationId, userId },
      });
      expect(notificationRepository.save).toHaveBeenCalledWith({
        ...mockNotification,
        isRead: true,
      });
      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException if notification not found', async () => {
      const notificationId = 'nonexistent';
      const userId = '1';

      (notificationRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(NotFoundException);
      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: notificationId, userId },
      });
    });
  });

  describe('bulkMarkAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      const userId = '1';
      const bulkReadDto: BulkReadNotificationsDto = {
        notificationIds: ['notification-1', 'notification-2', 'notification-3'],
      };

      const mockUpdateResult = { affected: 3 };

      (notificationRepository.update as jest.Mock).mockResolvedValue(mockUpdateResult);

      const result = await service.bulkMarkAsRead(bulkReadDto, userId);

      expect(notificationRepository.update).toHaveBeenCalledWith(
        {
          id: expect.anything(),
          userId,
        },
        { isRead: true, updatedAt: expect.anything() },
      );
      expect(result).toBe(3);
    });
  });

  describe('sendNotificationToUser', () => {
    it('should send a notification to a user', async () => {
      const userId = '1';
      const type = NotificationType.WALK_INVITATION;
      const title = 'Walk invitation';
      const message = 'Jane invited you to a walk';

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedNotification = {
        id: 'notification-1',
        userId,
        type,
        title,
        message,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      };

      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (notificationRepository.save as jest.Mock).mockResolvedValue(savedNotification);

      const result = await service.sendNotificationToUser(userId, type, title, message);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(notificationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        userId,
        type,
        title,
        message,
        isRead: false,
      }));
      expect(result).toEqual(savedNotification);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const userId = '1';
      const mockUpdateResult = { affected: 2 };

      (notificationRepository.update as jest.Mock).mockResolvedValue(mockUpdateResult);

      const result = await service.markAllAsRead(userId);

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { userId, isRead: false },
        { isRead: true, updatedAt: expect.anything() },
      );
      expect(result).toBe(2);
    });
  });
});