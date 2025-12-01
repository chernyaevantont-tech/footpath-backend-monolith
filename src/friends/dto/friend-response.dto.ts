import { ApiProperty } from '@nestjs/swagger';
import { FriendRequestStatus } from '../entities/friend-request.entity';

export class FriendResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Unique identifier of the friend',
  })
  id: string;

  @ApiProperty({
    example: 'friend@example.com',
    description: 'Email address of the friend',
  })
  email: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the friendship was established',
  })
  createdAt: Date;
}