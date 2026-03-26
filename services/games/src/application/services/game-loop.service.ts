import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Round } from "../../domain/round";
import { calculateCrashPoint, hashServerSeed } from "../../domain/provably-fair";
import { BetStatus } from "../../domain/bet";
import type { RoundRepository } from "../ports/round.repository";
import type { BetRepository } from "../ports/bet.repository";
import type { MessagePublisher } from "../ports/message-publisher";

@Injectable()
export class GameLoopService implements OnModuleInit {
  private readonly logger = new Logger(GameLoopService.name);

  private currentRound: Round | null = null;
  private currentMultiplier: number = 1.0;
  private roundStartTime: number = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private serverSeed: string = "";
  private publicSeed: string = "";
  private nonce: number = 0;

  private readonly BETTING_DURATION_MS = 10_000;
  private readonly COOLDOWN_MS = 3_000;
  private readonly TICK_INTERVAL_MS = 100;
  private readonly GROWTH_RATE = 0.06;

  constructor(
    @Inject("RoundRepository") private readonly roundRepo: RoundRepository,
    @Inject("BetRepository") private readonly betRepo: BetRepository,
    @Inject("MessagePublisher") private readonly publisher: MessagePublisher,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log("Game loop initializing, starting first round in 2s...");
    setTimeout(() => this.startNewRound(), 2000);
  }

  private async startNewRound(): Promise<void> {
    try {
      this.serverSeed = randomUUID() + randomUUID();
      this.publicSeed = randomUUID();
      this.nonce++;

      const crashPoint = calculateCrashPoint(this.serverSeed, this.publicSeed, this.nonce);
      const hash = hashServerSeed(this.serverSeed);

      this.currentRound = new Round({
        id: randomUUID(),
        crashPoint,
        serverSeedHash: hash,
      });
      this.currentMultiplier = 1.0;

      await this.roundRepo.save(this.currentRound, this.serverSeed, this.publicSeed, this.nonce);

      this.logger.log(
        `Round ${this.currentRound.id} started (BETTING phase, crash @ ${crashPoint}x)`,
      );

      setTimeout(() => this.startRunning(), this.BETTING_DURATION_MS);
    } catch (error) {
      this.logger.error(`Failed to start new round: ${error}`);
      setTimeout(() => this.startNewRound(), this.COOLDOWN_MS);
    }
  }

  private async startRunning(): Promise<void> {
    if (!this.currentRound) return;

    try {
      this.currentRound.startRunning();
      await this.roundRepo.updateStatus(this.currentRound.id, "RUNNING");

      this.logger.log(`Round ${this.currentRound.id} is now RUNNING`);

      this.roundStartTime = Date.now();
      this.tickInterval = setInterval(() => this.tick(), this.TICK_INTERVAL_MS);
    } catch (error) {
      this.logger.error(`Failed to start running: ${error}`);
    }
  }

  private async tick(): Promise<void> {
    if (!this.currentRound) return;

    const elapsed = (Date.now() - this.roundStartTime) / 1000;
    this.currentMultiplier = Math.floor(Math.exp(this.GROWTH_RATE * elapsed) * 100) / 100;

    if (this.currentMultiplier >= this.currentRound.crashPoint) {
      this.currentMultiplier = this.currentRound.crashPoint;
      await this.crashRound();
    }
  }

  private async crashRound(): Promise<void> {
    if (!this.currentRound || this.tickInterval === null) return;

    clearInterval(this.tickInterval);
    this.tickInterval = null;

    try {
      this.currentRound.crash();
      await this.roundRepo.updateStatus(this.currentRound.id, "CRASHED");
      await this.betRepo.markAllPendingAsLost(this.currentRound.id);

      const payouts: Array<{ playerId: string; amountCents: number }> = [];
      for (const [playerId, bet] of this.currentRound.bets) {
        if (bet.status === BetStatus.CASHED_OUT && bet.payoutCents !== null) {
          payouts.push({ playerId, amountCents: bet.payoutCents });
        }
      }

      await this.publisher.publishRoundEnded({
        eventId: randomUUID(),
        roundId: this.currentRound.id,
        crashPoint: this.currentRound.crashPoint,
        payouts,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Round ${this.currentRound.id} CRASHED at ${this.currentRound.crashPoint}x (${payouts.length} payouts)`,
      );

      this.currentRound = null;

      setTimeout(() => this.startNewRound(), this.COOLDOWN_MS);
    } catch (error) {
      this.logger.error(`Failed to crash round: ${error}`);
    }
  }

  getCurrentRound(): Round | null {
    return this.currentRound;
  }

  getCurrentMultiplier(): number {
    return this.currentMultiplier;
  }

  getServerSeed(): string {
    return this.serverSeed;
  }

  getPublicSeed(): string {
    return this.publicSeed;
  }

  getNonce(): number {
    return this.nonce;
  }

  getHash(): string {
    return this.currentRound ? this.currentRound.serverSeedHash : "";
  }

  removeBetFromCurrentRound(playerId: string): void {
    if (!this.currentRound) return;

    const betsMap = this.currentRound.bets as Map<string, unknown>;
    betsMap.delete(playerId);
  }
}
