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
import { ApiTags, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNotificationDto, UpdateNotificationDto, BulkReadNotificationsDto } from './dto/notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    type: [NotificationResponseDto]
  })
  async getUserNotifications(@Request() req): Promise<NotificationResponseDto[]> {
    this.logger.log(`Get notifications request for user ID: ${req.user.id}`);
    const notifications = await this.notificationsService.getUserNotifications(req.user.id);
    this.logger.log(`Returned ${notifications.length} notifications for user ID: ${req.user.id}`);
    return notifications;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Notification ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
    type: NotificationResponseDto
  })
  async markAsRead(@Param('id') id: string, @Request() req): Promise<NotificationResponseDto> {
    this.logger.log(`Mark notification as read request for notification ID: ${id}, user ID: ${req.user.id}`);
    const notification = await this.notificationsService.markAsRead(id, req.user.id);
    this.logger.log(`Notification ${id} marked as read for user ID: ${req.user.id}`);
    return notification;
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk-read')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({ type: BulkReadNotificationsDto })
  @ApiResponse({
    status: 200,
    description: 'Notifications marked as read successfully',
    schema: {
      example: {
        affected: 5,
      }
    }
  })
  async bulkMarkAsRead(@Body() bulkReadDto: BulkReadNotificationsDto, @Request() req): Promise<{ affected: number }> {
    this.logger.log(`Bulk mark as read request for ${bulkReadDto.notificationIds.length} notifications, user ID: ${req.user.id}`);
    const affected = await this.notificationsService.bulkMarkAsRead(bulkReadDto, req.user.id);
    this.logger.log(`Bulk marked ${affected} notifications as read for user ID: ${req.user.id}`);
    return { affected };
  }

  @UseGuards(JwtAuthGuard)
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read successfully',
    schema: {
      example: {
        affected: 10,
      }
    }
  })
  async markAllAsRead(@Request() req): Promise<{ affected: number }> {
    this.logger.log(`Mark all notifications as read request for user ID: ${req.user.id}`);
    const affected = await this.notificationsService.markAllAsRead(req.user.id);
    this.logger.log(`Marked ${affected} notifications as read for user ID: ${req.user.id}`);
    return { affected };
  }
}