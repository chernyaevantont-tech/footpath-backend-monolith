import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNotificationDto, UpdateNotificationDto, BulkReadNotificationsDto } from './dto/notification.dto';
import { Notification } from './entities/notification.entity';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getUserNotifications(@Request() req): Promise<Notification[]> {
    this.logger.log(`Get notifications request for user ID: ${req.user.userId}`);
    const notifications = await this.notificationsService.getUserNotifications(req.user.userId);
    this.logger.log(`Returned ${notifications.length} notifications for user ID: ${req.user.userId}`);
    return notifications;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string, @Request() req): Promise<Notification> {
    this.logger.log(`Mark notification as read request for notification ID: ${id}, user ID: ${req.user.userId}`);
    const notification = await this.notificationsService.markAsRead(id, req.user.userId);
    this.logger.log(`Notification ${id} marked as read for user ID: ${req.user.userId}`);
    return notification;
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk-read')
  @HttpCode(HttpStatus.OK)
  async bulkMarkAsRead(@Body() bulkReadDto: BulkReadNotificationsDto, @Request() req): Promise<{ affected: number }> {
    this.logger.log(`Bulk mark as read request for ${bulkReadDto.notificationIds.length} notifications, user ID: ${req.user.userId}`);
    const affected = await this.notificationsService.bulkMarkAsRead(bulkReadDto, req.user.userId);
    this.logger.log(`Bulk marked ${affected} notifications as read for user ID: ${req.user.userId}`);
    return { affected };
  }

  @UseGuards(JwtAuthGuard)
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Request() req): Promise<{ affected: number }> {
    this.logger.log(`Mark all notifications as read request for user ID: ${req.user.userId}`);
    const affected = await this.notificationsService.markAllAsRead(req.user.userId);
    this.logger.log(`Marked ${affected} notifications as read for user ID: ${req.user.userId}`);
    return { affected };
  }
}