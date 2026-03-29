import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { GameLoopService } from "../services/game-loop.service";
import type { BetRepository } from "../ports/bet.repository";
import type { MessagePublisher } from "../ports/message-publisher";
import type { GameEventEmitter } from "../ports/game-event-emitter";
import { InvalidRoundStateError } from "../../domain/errors";

@Injectable()
export class PlaceBetUseCase {
  constructor(
    private readonly gameLoop: GameLoopService,
    @Inject("BetRepository") private readonly betRepo: BetRepository,
    @Inject("MessagePublisher") private readonly publisher: MessagePublisher,
    @Inject("GameEventEmitter") private readonly eventEmitter: GameEventEmitter,
  ) {}

  async execute(
    playerId: string,
    amountCents: number,
    username?: string,
    autoCashoutAt?: number | null,
  ): Promise<{
    roundId: string;
    playerId: string;
    amountCents: number;
    status: string;
    autoCashoutAt: number | null;
  }> {
    const round = this.gameLoop.getCurrentRound();
    if (!round) {
      throw new InvalidRoundStateError("No active round available for betting");
    }

    const bet = round.placeBet(playerId, amountCents, autoCashoutAt);

    await this.betRepo.save(bet, round.id);

    await this.publisher.publishBetPlaced({
      eventId: randomUUID(),
      roundId: round.id,
      playerId,
      amountCents,
      timestamp: new Date().toISOString(),
    });

    this.eventEmitter.emitBetPlaced({
      playerId: bet.playerId,
      username: username ?? bet.playerId,
      amountCents: bet.amountCents,
    });

    return {
      roundId: round.id,
      playerId: bet.playerId,
      amountCents: bet.amountCents,
      status: bet.status,
      autoCashoutAt: bet.autoCashoutAt,
    };
  }
}
