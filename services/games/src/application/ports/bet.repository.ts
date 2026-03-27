import { Bet, BetStatus } from "../../domain/bet";

export interface BetRepository {
  save(bet: Bet, roundId: string): Promise<void>;

  updateCashOut(
    roundId: string,
    playerId: string,
    multiplier: number,
    payoutCents: number,
  ): Promise<void>;

  markAllPendingAsLost(roundId: string): Promise<void>;

  findByRound(roundId: string): Promise<
    Array<{
      playerId: string;
      amountCents: number;
      status: BetStatus;
      multiplierAtCashout: number | null;
      payoutCents: number | null;
      createdAt: Date;
    }>
  >;

  findByPlayer(
    playerId: string,
    page: number,
    limit: number,
  ): Promise<{
    bets: Array<{
      id: string;
      roundId: string;
      amountCents: number;
      status: BetStatus;
      multiplierAtCashout: number | null;
      payoutCents: number | null;
      createdAt: Date;
    }>;
    total: number;
  }>;

  deleteBet(roundId: string, playerId: string): Promise<void>;
}
