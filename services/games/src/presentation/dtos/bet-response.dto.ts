import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PlaceBetResponseDto {
  @ApiProperty({ description: "Round ID" })
  roundId: string;

  @ApiProperty({ description: "Player ID" })
  playerId: string;

  @ApiProperty({ description: "Bet amount in cents", example: 1000 })
  amountCents: number;

  @ApiProperty({ description: "Bet status", example: "PENDING" })
  status: string;

  @ApiPropertyOptional({ description: "Auto cashout multiplier target", example: 2.0 })
  autoCashoutAt: number | null;
}

export class CashOutResponseDto {
  @ApiProperty({ description: "Round ID" })
  roundId: string;

  @ApiProperty({ description: "Player ID" })
  playerId: string;

  @ApiProperty({ description: "Bet amount in cents", example: 1000 })
  amountCents: number;

  @ApiProperty({ description: "Bet status", example: "CASHED_OUT" })
  status: string;

  @ApiProperty({ description: "Multiplier at cash out", example: 2.5 })
  multiplierAtCashout: number;

  @ApiProperty({ description: "Payout amount in cents", example: 2500 })
  payoutCents: number;
}

export class PlayerBetItemDto {
  @ApiProperty({ description: "Bet ID" })
  id: string;

  @ApiProperty({ description: "Round ID" })
  roundId: string;

  @ApiProperty({ description: "Bet amount in cents", example: 1000 })
  amountCents: number;

  @ApiProperty({ description: "Bet status" })
  status: string;

  @ApiPropertyOptional({ description: "Multiplier at cash out" })
  multiplierAtCashout: number | null;

  @ApiPropertyOptional({ description: "Payout amount in cents" })
  payoutCents: number | null;

  @ApiProperty({ description: "Bet creation timestamp" })
  createdAt: Date;
}

export class PlayerBetsResponseDto {
  @ApiProperty({ type: [PlayerBetItemDto] })
  bets: PlayerBetItemDto[];

  @ApiProperty({ description: "Total number of bets" })
  total: number;

  @ApiProperty({ description: "Current page" })
  page: number;

  @ApiProperty({ description: "Items per page" })
  limit: number;
}
