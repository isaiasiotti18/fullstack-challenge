import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../database/prisma.service";
import type { MessagePublisher } from "../../application/ports/message-publisher";
import type { BetPlacedMessage, RoundEndedMessage } from "./events";

@Injectable()
export class OutboxPublisher implements MessagePublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  constructor(private readonly prisma: PrismaService) {}

  async publishBetPlaced(event: BetPlacedMessage): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        id: randomUUID(),
        aggregateId: event.roundId,
        eventType: "BetPlaced",
        routingKey: "bet.placed",
        payload: event as object,
      },
    });

    this.logger.debug(`Outbox: queued bet.placed for round ${event.roundId}`);
  }

  async publishRoundEnded(event: RoundEndedMessage): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        id: randomUUID(),
        aggregateId: event.roundId,
        eventType: "RoundEnded",
        routingKey: "round.ended",
        payload: event as object,
      },
    });

    this.logger.debug(`Outbox: queued round.ended for round ${event.roundId}`);
  }
}
