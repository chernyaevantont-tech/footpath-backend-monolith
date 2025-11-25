import { IsEnum, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'UUID of the user receiving the notification',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    example: 'friend_request',
    description: 'Type of notification',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    example: 'New friend request',
    description: 'Title of the notification',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'John Doe sent you a friend request',
    description: 'Message content of the notification',
  })
  @IsString()
  message: string;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the notification has been read',
  })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}

export class BulkReadNotificationsDto {
  @ApiProperty({
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef', 'b2c3d4e5-f678-9012-3456-7890abcdef12'],
    description: 'Array of notification IDs to mark as read',
  })
  @IsString({ each: true })
  notificationIds: string[];
}