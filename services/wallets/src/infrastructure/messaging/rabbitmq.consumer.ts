import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "./rabbitmq.service";
import { RabbitMQPublisher } from "./rabbitmq.publisher";
import type { BetPlacedMessage, RoundEndedMessage } from "./events";
import type { WalletRepository } from "../../application/ports/wallet.repository";
import { InsufficientBalanceError } from "../../domain/errors";

@Injectable()
export class RabbitMQConsumer implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQConsumer.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly rabbitMQPublisher: RabbitMQPublisher,
    @Inject("WalletRepository")
    private readonly walletRepository: WalletRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    setTimeout(() => this.startConsuming(), 2000);
  }

  private async startConsuming(): Promise<void> {
    this.logger.log("Starting RabbitMQ consumer...");

    await this.rabbitMQService.consume(async (routingKey, message) => {
      switch (routingKey) {
        case "bet.placed":
          await this.handleBetPlaced(message as BetPlacedMessage);
          break;
        case "round.ended":
          await this.handleRoundEnded(message as RoundEndedMessage);
          break;
        default:
          this.logger.warn(`Unhandled routing key: ${routingKey}`);
      }
    });
  }

  private async handleBetPlaced(msg: BetPlacedMessage): Promise<void> {
    this.logger.log(
      `Handling bet.placed: player ${msg.playerId}, round ${msg.roundId}, amount ${msg.amountCents} cents`,
    );

    try {
      const wallet = await this.walletRepository.findByPlayerId(msg.playerId);

      if (!wallet) {
        this.logger.warn(`Wallet not found for player ${msg.playerId}`);
        await this.rabbitMQPublisher.publishWalletDebitFailed({
          eventId: crypto.randomUUID(),
          roundId: msg.roundId,
          playerId: msg.playerId,
          amountCents: msg.amountCents,
          reason: "Wallet not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      wallet.debit(msg.amountCents);
      await this.walletRepository.updateBalance(wallet.id, wallet.balanceCents);

      this.logger.log(
        `Debited ${msg.amountCents} cents from player ${msg.playerId}. New balance: ${wallet.balanceCents} cents`,
      );

      await this.rabbitMQPublisher.publishWalletDebited({
        eventId: crypto.randomUUID(),
        roundId: msg.roundId,
        playerId: msg.playerId,
        amountCents: msg.amountCents,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof InsufficientBalanceError) {
        this.logger.warn(`Insufficient balance for player ${msg.playerId}: ${error.message}`);
        await this.rabbitMQPublisher.publishWalletDebitFailed({
          eventId: crypto.randomUUID(),
          roundId: msg.roundId,
          playerId: msg.playerId,
          amountCents: msg.amountCents,
          reason: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      this.logger.error(
        `Unexpected error handling bet.placed for player ${msg.playerId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async handleRoundEnded(msg: RoundEndedMessage): Promise<void> {
    this.logger.log(
      `Handling round.ended: round ${msg.roundId}, crash point ${msg.crashPoint}, ${msg.payouts.length} payouts`,
    );

    for (const payout of msg.payouts) {
      try {
        const wallet = await this.walletRepository.findByPlayerId(payout.playerId);

        if (!wallet) {
          this.logger.warn(
            `Wallet not found for player ${payout.playerId} during payout. Skipping.`,
          );
          continue;
        }

        wallet.credit(payout.amountCents);
        await this.walletRepository.updateBalance(wallet.id, wallet.balanceCents);

        this.logger.log(
          `Credited ${payout.amountCents} cents to player ${payout.playerId}. New balance: ${wallet.balanceCents} cents`,
        );
      } catch (error) {
        this.logger.error(
          `Error processing payout for player ${payout.playerId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(`Processed ${msg.payouts.length} payouts for round ${msg.roundId}`);
  }
}
