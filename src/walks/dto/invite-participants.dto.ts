import { IsUUID, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteParticipantsDto {
  @ApiProperty({
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef', 'b2c3d4e5-f678-9012-3456-7890abcdef12'],
    description: 'Array of user IDs to invite to the walk',
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  userIds: string[];
}