import { Inject, Injectable } from "@nestjs/common";
import type { BetRepository } from "../ports/bet.repository";

@Injectable()
export class GetPlayerBetsUseCase {
  constructor(@Inject("BetRepository") private readonly betRepo: BetRepository) {}

  async execute(
    playerId: string,
    page: number,
    limit: number,
  ): Promise<{
    bets: Array<{
      id: string;
      roundId: string;
      amountCents: number;
      status: string;
      multiplierAtCashout: number | null;
      payoutCents: number | null;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const { bets, total } = await this.betRepo.findByPlayer(playerId, page, limit);

    return { bets, total, page, limit };
  }
}
