import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { IsString } from "class-validator/types/decorator/typechecker/IsString";

export class UpdateTagDto {
  @ApiProperty({
    example: 'Updated Tag Name',
    description: 'New name of the tag',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}