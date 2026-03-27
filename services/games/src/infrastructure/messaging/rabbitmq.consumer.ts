import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "./rabbitmq.service";
import { GameLoopService } from "../../application/services/game-loop.service";
import type { BetRepository } from "../../application/ports/bet.repository";
import { Inject } from "@nestjs/common";
import type { WalletDebitedMessage, WalletDebitFailedMessage } from "./events";

@Injectable()
export class RabbitMQConsumer implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly gameLoop: GameLoopService,
    @Inject("BetRepository") private readonly betRepo: BetRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.consume(async (routingKey, message) => {
      if (!message || typeof message !== "object") {
        this.logger.warn(`Invalid message received for routing key: ${routingKey}`);
        return;
      }

      switch (routingKey) {
        case "wallet.debited":
          if (!("roundId" in message) || !("playerId" in message) || !("amountCents" in message)) {
            this.logger.warn(`Invalid wallet.debited message: missing required fields`);
            return;
          }
          await this.handleWalletDebited(message as WalletDebitedMessage);
          break;
        case "wallet.debit_failed":
          if (!("roundId" in message) || !("playerId" in message) || !("reason" in message)) {
            this.logger.warn(`Invalid wallet.debit_failed message: missing required fields`);
            return;
          }
          await this.handleWalletDebitFailed(message as WalletDebitFailedMessage);
          break;
        default:
          this.logger.warn(`Unknown routing key: ${routingKey}`);
      }
    });
  }

  private async handleWalletDebited(message: WalletDebitedMessage): Promise<void> {
    this.logger.log(
      `Wallet debited for player ${message.playerId}, round ${message.roundId}, amount ${message.amountCents} cents`,
    );
  }

  private async handleWalletDebitFailed(message: WalletDebitFailedMessage): Promise<void> {
    this.logger.warn(
      `Wallet debit failed for player ${message.playerId}, round ${message.roundId}: ${message.reason}`,
    );

    try {
      this.gameLoop.removeBetFromCurrentRound(message.playerId);
      await this.betRepo.deleteBet(message.roundId, message.playerId);
      this.logger.log(`Removed bet for player ${message.playerId} from round ${message.roundId}`);
    } catch (error) {
      this.logger.error(`Failed to remove bet after debit failure: ${error}`);
    }
  }
}
