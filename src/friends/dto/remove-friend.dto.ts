import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveFriendDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'UUID of the friend to remove',
  })
  @IsUUID()
  userId: string;
}