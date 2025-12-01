import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Unique identifier of the notification',
  })
  id: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'ID of the user who received the notification',
  })
  userId: string;

  @ApiProperty({
    example: NotificationType.FRIEND_REQUEST,
    enum: NotificationType,
    description: 'Type of the notification',
  })
  type: NotificationType;

  @ApiProperty({
    example: 'Friend request received',
    description: 'Title of the notification',
  })
  title: string;

  @ApiProperty({
    example: 'John Doe sent you a friend request',
    description: 'Message content of the notification',
  })
  message: string;

  @ApiProperty({
    example: false,
    description: 'Whether the notification has been read',
  })
  isRead: boolean;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the notification was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the notification was last updated',
  })
  updatedAt: Date;
}