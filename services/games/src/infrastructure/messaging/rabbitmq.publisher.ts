import { Injectable } from "@nestjs/common";
import { RabbitMQService } from "./rabbitmq.service";
import type { MessagePublisher } from "../../application/ports/message-publisher";
import type { BetPlacedMessage, RoundEndedMessage } from "./events";

@Injectable()
export class RabbitMQPublisher implements MessagePublisher {
  constructor(private readonly rabbitmq: RabbitMQService) {}

  async publishBetPlaced(event: BetPlacedMessage): Promise<void> {
    await this.rabbitmq.publish("bet.placed", event);
  }

  async publishRoundEnded(event: RoundEndedMessage): Promise<void> {
    await this.rabbitmq.publish("round.ended", event);
  }
}
