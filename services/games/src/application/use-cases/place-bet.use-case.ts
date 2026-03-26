import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { GameLoopService } from "../services/game-loop.service";
import type { BetRepository } from "../ports/bet.repository";
import type { MessagePublisher } from "../ports/message-publisher";
import { InvalidRoundStateError } from "../../domain/errors";

@Injectable()
export class PlaceBetUseCase {
  constructor(
    private readonly gameLoop: GameLoopService,
    @Inject("BetRepository") private readonly betRepo: BetRepository,
    @Inject("MessagePublisher") private readonly publisher: MessagePublisher,
  ) {}

  async execute(
    playerId: string,
    amountCents: number,
  ): Promise<{
    roundId: string;
    playerId: string;
    amountCents: number;
    status: string;
  }> {
    const round = this.gameLoop.getCurrentRound();
    if (!round) {
      throw new InvalidRoundStateError("No active round available for betting");
    }

    const bet = round.placeBet(playerId, amountCents);

    await this.betRepo.save(bet, round.id);

    await this.publisher.publishBetPlaced({
      eventId: randomUUID(),
      roundId: round.id,
      playerId,
      amountCents,
      timestamp: new Date().toISOString(),
    });

    return {
      roundId: round.id,
      playerId: bet.playerId,
      amountCents: bet.amountCents,
      status: bet.status,
    };
  }
}
