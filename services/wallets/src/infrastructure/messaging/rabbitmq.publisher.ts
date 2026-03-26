import { Injectable, Logger } from "@nestjs/common";
import { RabbitMQService } from "./rabbitmq.service";
import type { WalletDebitedMessage, WalletDebitFailedMessage } from "./events";

@Injectable()
export class RabbitMQPublisher {
  private readonly logger = new Logger(RabbitMQPublisher.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async publishWalletDebited(message: WalletDebitedMessage): Promise<void> {
    this.logger.log(
      `Publishing wallet.debited for player ${message.playerId}, round ${message.roundId}, amount ${message.amountCents} cents`,
    );
    await this.rabbitMQService.publish("wallet.debited", message);
  }

  async publishWalletDebitFailed(message: WalletDebitFailedMessage): Promise<void> {
    this.logger.warn(
      `Publishing wallet.debit_failed for player ${message.playerId}, round ${message.roundId}: ${message.reason}`,
    );
    await this.rabbitMQService.publish("wallet.debit_failed", message);
  }
}
