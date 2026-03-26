import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RoundBetResponseDto {
  @ApiProperty({ description: "Player ID" })
  playerId: string;

  @ApiProperty({ description: "Bet amount in cents", example: 1000 })
  amountCents: number;

  @ApiProperty({ description: "Bet status", example: "PENDING" })
  status: string;

  @ApiPropertyOptional({
    description: "Multiplier at cash out",
    example: 2.5,
  })
  multiplierAtCashout: number | null;

  @ApiPropertyOptional({
    description: "Payout amount in cents",
    example: 2500,
  })
  payoutCents: number | null;

  @ApiProperty({ description: "Bet creation timestamp" })
  createdAt: Date;
}

export class CurrentRoundResponseDto {
  @ApiProperty({ description: "Round ID" })
  id: string;

  @ApiProperty({ description: "Round status", example: "BETTING" })
  status: string;

  @ApiProperty({ description: "Server seed hash for provably fair verification" })
  serverSeedHash: string;

  @ApiProperty({ description: "Current multiplier", example: 1.5 })
  currentMultiplier: number;

  @ApiPropertyOptional({
    description: "Crash point (null if round has not crashed)",
    example: null,
  })
  crashPoint: number | null;

  @ApiProperty({
    description: "Bets placed in this round",
    type: [RoundBetResponseDto],
  })
  bets: RoundBetResponseDto[];
}

export class RoundHistoryItemDto {
  @ApiProperty({ description: "Round ID" })
  id: string;

  @ApiProperty({ description: "Round status" })
  status: string;

  @ApiProperty({ description: "Crash point", example: 2.34 })
  crashPoint: number;

  @ApiProperty({ description: "Server seed hash" })
  hash: string;

  @ApiProperty({ description: "Round creation timestamp" })
  createdAt: Date;
}

export class RoundHistoryResponseDto {
  @ApiProperty({ type: [RoundHistoryItemDto] })
  rounds: RoundHistoryItemDto[];

  @ApiProperty({ description: "Total number of rounds" })
  total: number;

  @ApiProperty({ description: "Current page" })
  page: number;

  @ApiProperty({ description: "Items per page" })
  limit: number;
}
