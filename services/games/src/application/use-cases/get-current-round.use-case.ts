import { Inject, Injectable } from "@nestjs/common";
import { GameLoopService } from "../services/game-loop.service";
import type { BetRepository } from "../ports/bet.repository";

@Injectable()
export class GetCurrentRoundUseCase {
  constructor(
    private readonly gameLoop: GameLoopService,
    @Inject("BetRepository") private readonly betRepo: BetRepository,
  ) {}

  async execute(): Promise<{
    id: string;
    status: string;
    serverSeedHash: string;
    currentMultiplier: number;
    crashPoint: number | null;
    bets: Array<{
      playerId: string;
      amountCents: number;
      status: string;
      multiplierAtCashout: number | null;
      payoutCents: number | null;
      createdAt: Date;
    }>;
  } | null> {
    const round = this.gameLoop.getCurrentRound();
    if (!round) {
      return null;
    }

    const bets = await this.betRepo.findByRound(round.id);

    return {
      id: round.id,
      status: round.status,
      serverSeedHash: round.serverSeedHash,
      currentMultiplier: this.gameLoop.getCurrentMultiplier(),
      crashPoint: null,
      bets,
    };
  }
}
