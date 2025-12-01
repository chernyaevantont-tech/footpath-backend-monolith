import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto, UpdateNotificationDto, BulkReadNotificationsDto } from './dto/notification.dto';
import { User } from '../auth/entities/user.entity';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Helper method to convert Notification entity to NotificationResponseDto
  private entityToDto(notification: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.userId = notification.userId;
    dto.type = notification.type;
    dto.title = notification.title;
    dto.message = notification.message;
    dto.isRead = notification.isRead;
    dto.createdAt = notification.createdAt;
    dto.updatedAt = notification.updatedAt;
    return dto;
  }

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<NotificationResponseDto> {
    this.logger.log(`Creating notification for user ID: ${createNotificationDto.userId}, type: ${createNotificationDto.type}`);

    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: createNotificationDto.userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const notification = new Notification();
    notification.userId = createNotificationDto.userId;
    notification.type = createNotificationDto.type;
    notification.title = createNotificationDto.title;
    notification.message = createNotificationDto.message;
    notification.isRead = false;

    const createdNotification = await this.notificationRepository.save(notification);
    this.logger.log(`Notification created successfully with ID: ${createdNotification.id}`);

    return this.entityToDto(createdNotification);
  }

  async getUserNotifications(userId: string): Promise<NotificationResponseDto[]> {
    this.logger.log(`Fetching notifications for user ID: ${userId}`);

    const notifications = await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    this.logger.log(`Found ${notifications.length} notifications for user ID: ${userId}`);
    
    return notifications.map(notification => this.entityToDto(notification));
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationResponseDto> {
    this.logger.log(`Marking notification ${notificationId} as read for user ID: ${userId}`);

    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found or does not belong to user');
    }

    notification.isRead = true;
    notification.updatedAt = new Date();

    const updatedNotification = await this.notificationRepository.save(notification);
    this.logger.log(`Notification ${notificationId} marked as read`);

    return this.entityToDto(updatedNotification);
  }

  async bulkMarkAsRead(bulkReadDto: BulkReadNotificationsDto, userId: string): Promise<number> {
    this.logger.log(`Bulk marking ${bulkReadDto.notificationIds.length} notifications as read for user ID: ${userId}`);

    const { affected } = await this.notificationRepository.update(
      {
        id: In(bulkReadDto.notificationIds),
        userId,
      },
      { isRead: true, updatedAt: new Date() },
    );

    this.logger.log(`Marked ${affected} notifications as read`);

    return affected || 0;
  }

  async sendNotificationToUser(userId: string, type: NotificationType, title: string, message: string): Promise<NotificationResponseDto> {
    this.logger.log(`Sending notification to user ${userId} with type ${type}`);

    const createDto: CreateNotificationDto = {
      userId,
      type,
      title,
      message,
    };

    return await this.createNotification(createDto);
  }

  async markAllAsRead(userId: string): Promise<number> {
    this.logger.log(`Marking all notifications as read for user ID: ${userId}`);

    const { affected } = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, updatedAt: new Date() },
    );

    this.logger.log(`Marked ${affected} notifications as read for user ID: ${userId}`);

    return affected || 0;
  }
}

// Import In from TypeORM to use in bulkMarkAsRead
