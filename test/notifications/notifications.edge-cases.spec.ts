import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { Notification } from '../../src/notifications/entities/notification.entity';
import { User } from '../../src/auth/entities/user.entity';
import { CreateNotificationDto, BulkReadNotificationsDto } from '../../src/notifications/dto/notification.dto';
import { NotificationType } from '../../src/notifications/entities/notification.entity';

describe('NotificationsService Edge Cases', () => {
  let service: NotificationsService;
  let notificationRepository: Repository<Notification>;
  let userRepository: Repository<User>;

  const mockNotificationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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

  it('should handle empty notification IDs in bulkMarkAsRead', async () => {
    const userId = '1';
    const bulkReadDto: BulkReadNotificationsDto = {
      notificationIds: [],
    };

    const mockUpdateResult = { affected: 0 };
    (notificationRepository.update as jest.Mock).mockResolvedValue(mockUpdateResult);

    const result = await service.bulkMarkAsRead(bulkReadDto, userId);

    expect(notificationRepository.update).toHaveBeenCalledWith(
      {
        id: expect.anything(),
        userId,
      },
      { isRead: true, updatedAt: expect.anything() },
    );
    expect(result).toBe(0);
  });

  it('should handle non-existent user when creating notification', async () => {
    const createNotificationDto: CreateNotificationDto = {
      userId: 'nonexistent-user',
      type: NotificationType.FRIEND_REQUEST,
      title: 'Test Title',
      message: 'Test Message',
    };

    (userRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.createNotification(createNotificationDto)).rejects.toThrow(BadRequestException);
    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: createNotificationDto.userId } });
    expect(notificationRepository.save).not.toHaveBeenCalled();
  });

  it('should handle non-existent notification when marking as read', async () => {
    const notificationId = 'nonexistent-notification';
    const userId = '1';

    (notificationRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(NotFoundException);
    expect(notificationRepository.findOne).toHaveBeenCalledWith({
      where: { id: notificationId, userId },
    });
  });

  it('should handle notification not belonging to user when marking as read', async () => {
    const notificationId = 'notification-1';
    const userId = '1';
    const differentUserId = '2';

    // The service query uses both ID and userId: { id: notificationId, userId }
    // So if we're looking for a notification with id=notification-1 AND userId=userId,
    // but the actual notification has id=notification-1 AND userId=differentUserId,
    // the query will return null
    (notificationRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(NotFoundException);
    expect(notificationRepository.findOne).toHaveBeenCalledWith({
      where: { id: notificationId, userId },
    });
  });

  it('should handle empty result when getting user notifications', async () => {
    const userId = '1';

    (notificationRepository.find as jest.Mock).mockResolvedValue([]);

    const result = await service.getUserNotifications(userId);

    expect(notificationRepository.find).toHaveBeenCalledWith({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    expect(result).toEqual([]);
  });

  it('should handle invalid notification type when creating notification', async () => {
    const createNotificationDto: CreateNotificationDto = {
      userId: '1',
      type: 'invalid_type' as NotificationType, // This is invalid but will pass TypeScript validation
      title: 'Test Title',
      message: 'Test Message',
    };

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashed_password',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
    (notificationRepository.save as jest.Mock).mockResolvedValue({
      id: 'notification-1',
      ...createNotificationDto,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.createNotification(createNotificationDto);

    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: createNotificationDto.userId } });
    expect(notificationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      userId: createNotificationDto.userId,
      type: createNotificationDto.type,
    }));
    expect(result.type).toBe('invalid_type');
  });

  it('should handle bulkMarkAsRead with non-existent notification IDs', async () => {
    const userId = '1';
    const bulkReadDto: BulkReadNotificationsDto = {
      notificationIds: ['nonexistent-1', 'nonexistent-2'],
    };

    const mockUpdateResult = { affected: 0 };
    (notificationRepository.update as jest.Mock).mockResolvedValue(mockUpdateResult);

    const result = await service.bulkMarkAsRead(bulkReadDto, userId);

    expect(notificationRepository.update).toHaveBeenCalledWith(
      {
        id: expect.anything(),
        userId,
      },
      { isRead: true, updatedAt: expect.anything() },
    );
    expect(result).toBe(0);
  });

  it('should handle markAllAsRead when user has no notifications', async () => {
    const userId = '1';

    const mockUpdateResult = { affected: 0 };
    (notificationRepository.update as jest.Mock).mockResolvedValue(mockUpdateResult);

    const result = await service.markAllAsRead(userId);

    expect(notificationRepository.update).toHaveBeenCalledWith(
      { userId, isRead: false },
      { isRead: true, updatedAt: expect.anything() },
    );
    expect(result).toBe(0);
  });

  it('should handle markAllAsRead when user has no unread notifications', async () => {
    const userId = '1';

    const mockUpdateResult = { affected: 0 };
    (notificationRepository.update as jest.Mock).mockResolvedValue(mockUpdateResult);

    const result = await service.markAllAsRead(userId);

    expect(notificationRepository.update).toHaveBeenCalledWith(
      { userId, isRead: false },
      { isRead: true, updatedAt: expect.anything() },
    );
    expect(result).toBe(0);
  });

  it('should handle sendNotificationToUser with special characters in title and message', async () => {
    const userId = '1';
    const type = NotificationType.SYSTEM;
    const title = 'System Alert: Test with "quotes" and \'apostrophes\'';
    const message = 'This is a message with <script>alert("xss")</script> and other special chars: &@#$%^*()';

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
    expect(result.title).toBe(title);
    expect(result.message).toBe(message);
  });
});