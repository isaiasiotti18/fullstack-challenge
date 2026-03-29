import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, Min, Max, IsOptional, IsNumber } from "class-validator";

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

  @IsOptional()
  @IsNumber()
  @Min(1.01)
  @ApiPropertyOptional({
    description: "Auto cashout multiplier target (e.g. 2.0 for automatic cashout at 2.00x)",
    example: 2.0,
    minimum: 1.01,
  })
  autoCashoutAt?: number;
}
