import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min, Max } from "class-validator";

export class PlaceBetDto {
  @IsInt()
  @Min(100)
  @Max(100000)
  @ApiProperty({
    description: "Bet amount in cents",
    example: 1000,
    minimum: 100,
    maximum: 100000,
  })
  amountCents: number;
}
