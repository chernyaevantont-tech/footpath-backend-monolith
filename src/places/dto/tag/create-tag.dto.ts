import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateTagDto {
    @ApiProperty({
        example: "Nature",
        description: "Name of the tag",
    })
    @IsString()
    @IsNotEmpty()
    name: string;
}