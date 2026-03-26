import { Inject, Injectable } from "@nestjs/common";
import { GameLoopService } from "../services/game-loop.service";
import type { BetRepository } from "../ports/bet.repository";
import { InvalidRoundStateError } from "../../domain/errors";

@Injectable()
export class CashOutUseCase {
  constructor(
    private readonly gameLoop: GameLoopService,
    @Inject("BetRepository") private readonly betRepo: BetRepository,
  ) {}

  async execute(playerId: string): Promise<{
    roundId: string;
    playerId: string;
    amountCents: number;
    status: string;
    multiplierAtCashout: number;
    payoutCents: number;
  }> {
    const round = this.gameLoop.getCurrentRound();
    if (!round) {
      throw new InvalidRoundStateError("No active round available for cash out");
    }

    const currentMultiplier = this.gameLoop.getCurrentMultiplier();
    const bet = round.cashOut(playerId, currentMultiplier);

    await this.betRepo.updateCashOut(round.id, playerId, bet.cashOutMultiplier!, bet.payoutCents!);

    return {
      roundId: round.id,
      playerId: bet.playerId,
      amountCents: bet.amountCents,
      status: bet.status,
      multiplierAtCashout: bet.cashOutMultiplier!,
      payoutCents: bet.payoutCents!,
    };
  }
}
