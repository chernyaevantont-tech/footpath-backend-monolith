import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class UpdateTagDto {
  @ApiProperty({
    example: 'Updated Tag Name',
    description: 'New name of the tag',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}