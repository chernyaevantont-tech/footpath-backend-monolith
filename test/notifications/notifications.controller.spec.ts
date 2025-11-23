import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { NotificationsController } from '../../src/notifications/notifications.controller';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { Notification } from '../../src/notifications/entities/notification.entity';
import { NotificationType } from '../../src/notifications/entities/notification.entity';
import { CreateNotificationDto, BulkReadNotificationsDto } from '../../src/notifications/dto/notification.dto';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    getUserNotifications: jest.fn(),
    markAsRead: jest.fn(),
    bulkMarkAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserNotifications', () => {
    it('should return all notifications for the user', async () => {
      const userId = '1';
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

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
      ];

      (service.getUserNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      const result = await controller.getUserNotifications(mockRequest);

      expect(service.getUserNotifications).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notificationId = 'notification-1';
      const userId = '1';
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      const mockNotification = {
        id: notificationId,
        userId,
        type: NotificationType.FRIEND_REQUEST,
        title: 'New friend request',
        message: 'John wants to be your friend',
        isRead: true, // Updated to read
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service.markAsRead as jest.Mock).mockResolvedValue(mockNotification);

      const result = await controller.markAsRead(notificationId, mockRequest);

      expect(service.markAsRead).toHaveBeenCalledWith(notificationId, userId);
      expect(result).toEqual(mockNotification);
    });
  });

  describe('bulkMarkAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      const userId = '1';
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      const bulkReadDto: BulkReadNotificationsDto = {
        notificationIds: ['notification-1', 'notification-2'],
      };

      (service.bulkMarkAsRead as jest.Mock).mockResolvedValue(2);

      const result = await controller.bulkMarkAsRead(bulkReadDto, mockRequest);

      expect(service.bulkMarkAsRead).toHaveBeenCalledWith(bulkReadDto, userId);
      expect(result).toEqual({ affected: 2 });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const userId = '1';
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      (service.markAllAsRead as jest.Mock).mockResolvedValue(3);

      const result = await controller.markAllAsRead(mockRequest);

      expect(service.markAllAsRead).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ affected: 3 });
    });
  });
});