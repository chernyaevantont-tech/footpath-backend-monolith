import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class LoginResponseDto {
  @ApiProperty({
    type: UserResponseDto,
    description: 'User information',
  })
  user: UserResponseDto;

  @ApiProperty({
    example: 'jwt-token-string',
    description: 'JWT token for authentication',
  })
  token: string;
}