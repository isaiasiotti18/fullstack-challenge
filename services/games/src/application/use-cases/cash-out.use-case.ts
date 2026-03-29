import { Inject, Injectable } from "@nestjs/common";
import { GameLoopService } from "../services/game-loop.service";
import type { BetRepository } from "../ports/bet.repository";
import type { GameEventEmitter } from "../ports/game-event-emitter";
import { InvalidRoundStateError } from "../../domain/errors";

@Injectable()
export class CashOutUseCase {
  constructor(
    private readonly gameLoop: GameLoopService,
    @Inject("BetRepository") private readonly betRepo: BetRepository,
    @Inject("GameEventEmitter") private readonly eventEmitter: GameEventEmitter,
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

    if (bet.cashOutMultiplier == null || bet.payoutCents == null) {
      throw new InvalidRoundStateError("Cash out failed: multiplier or payout not set");
    }

    const multiplier = bet.cashOutMultiplier;
    const payout = bet.payoutCents;

    await this.betRepo.updateCashOut(round.id, playerId, multiplier, payout);

    this.eventEmitter.emitBetCashedOut({
      playerId: bet.playerId,
      multiplier,
      payoutCents: payout,
    });

    return {
      roundId: round.id,
      playerId: bet.playerId,
      amountCents: bet.amountCents,
      status: bet.status,
      multiplierAtCashout: multiplier,
      payoutCents: payout,
    };
  }
}
