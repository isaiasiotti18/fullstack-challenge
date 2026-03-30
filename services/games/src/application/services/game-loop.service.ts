import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Round, RoundStatus } from "../../domain/round";
import { BetStatus } from "../../domain/bet";
import { calculateCrashPoint, hashServerSeed } from "../../domain/provably-fair";
import { calculateMultiplier } from "../../domain/multiplier";
import type { RoundRepository } from "../ports/round.repository";
import type { BetRepository } from "../ports/bet.repository";
import type { MessagePublisher } from "../ports/message-publisher";
import type { GameEventEmitter } from "../ports/game-event-emitter";
import type { MetricsService } from "../../infrastructure/metrics/metrics.service";

@Injectable()
export class GameLoopService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameLoopService.name);

  private currentRound: Round | null = null;
  private currentMultiplier: number = 1.0;
  private roundStartTime: number = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private serverSeed: string = "";
  private publicSeed: string = "";
  private nonce: number = 0;
  private shuttingDown = false;

  private readonly BETTING_DURATION_MS = 10_000;
  private readonly COOLDOWN_MS = 3_000;
  private readonly TICK_INTERVAL_MS = 100;
  private readonly GROWTH_RATE = 0.06;

  constructor(
    @Inject("RoundRepository") private readonly roundRepo: RoundRepository,
    @Inject("BetRepository") private readonly betRepo: BetRepository,
    @Inject("MessagePublisher") private readonly publisher: MessagePublisher,
    @Inject("GameEventEmitter") private readonly eventEmitter: GameEventEmitter,
    @Inject("MetricsService") private readonly metrics: MetricsService | null,
  ) {}

  onModuleDestroy(): void {
    this.shuttingDown = true;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.currentRound = null;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log("Game loop initializing, starting first round in 2s...");
    setTimeout(() => this.startNewRound(), 2000);
  }

  private async startNewRound(): Promise<void> {
    if (this.shuttingDown) return;

    try {
      this.serverSeed = randomUUID() + randomUUID();
      this.publicSeed = randomUUID();
      this.nonce++;

      let crashPoint = calculateCrashPoint(this.serverSeed, this.publicSeed, this.nonce);

      const testPoints = process.env.TEST_CRASH_POINTS;
      if (testPoints && process.env.NODE_ENV !== "production") {
        const points = testPoints
          .split(",")
          .map(Number)
          .filter((n) => n >= 1);
        if (points.length > 0) {
          crashPoint = points[(this.nonce - 1) % points.length];
        }
      }
      const hash = hashServerSeed(this.serverSeed);

      this.currentRound = new Round({
        id: randomUUID(),
        crashPoint,
        serverSeedHash: hash,
      });
      this.currentMultiplier = 1.0;

      await this.roundRepo.save(this.currentRound, this.serverSeed, this.publicSeed, this.nonce);

      const now = Date.now();
      this.eventEmitter.emitBettingPhase({
        roundId: this.currentRound.id,
        startsAt: new Date(now).toISOString(),
        endsAt: new Date(now + this.BETTING_DURATION_MS).toISOString(),
        hash,
      });

      this.metrics?.roundPhase.set(1);

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
      await this.roundRepo.updateStatus(this.currentRound.id, RoundStatus.RUNNING);

      this.eventEmitter.emitRoundStart({
        roundId: this.currentRound.id,
        hash: this.currentRound.serverSeedHash,
      });

      this.metrics?.roundPhase.set(2);

      this.logger.log(`Round ${this.currentRound.id} is now RUNNING`);

      this.roundStartTime = Date.now();
      this.tickInterval = setInterval(() => this.tick(), this.TICK_INTERVAL_MS);
    } catch (error) {
      this.logger.error(`Failed to start running: ${error}`);
    }
  }

  private async tick(): Promise<void> {
    if (!this.currentRound) return;

    try {
      const elapsed = (Date.now() - this.roundStartTime) / 1000;
      this.currentMultiplier = calculateMultiplier(elapsed, this.GROWTH_RATE);

      if (this.currentMultiplier >= this.currentRound.crashPoint) {
        this.currentMultiplier = this.currentRound.crashPoint;
        await this.crashRound();
      } else {
        await this.processAutoCashouts();
        this.eventEmitter.emitTick({ multiplier: this.currentMultiplier });
      }
    } catch (error) {
      this.logger.error(`Tick error, forcing crash: ${error}`);
      if (this.tickInterval) {
        clearInterval(this.tickInterval);
        this.tickInterval = null;
      }
      await this.crashRound();
    }
  }

  private async crashRound(): Promise<void> {
    if (!this.currentRound || this.tickInterval === null) return;

    clearInterval(this.tickInterval);
    this.tickInterval = null;

    try {
      this.currentRound.crash();
      await this.roundRepo.updateStatus(this.currentRound.id, RoundStatus.CRASHED);
      await this.betRepo.markAllPendingAsLost(this.currentRound.id);

      const payouts = this.currentRound.payouts;

      await this.publisher.publishRoundEnded({
        eventId: randomUUID(),
        roundId: this.currentRound.id,
        crashPoint: this.currentRound.crashPoint,
        payouts,
        timestamp: new Date().toISOString(),
      });

      this.eventEmitter.emitCrash({
        roundId: this.currentRound.id,
        crashPoint: this.currentRound.crashPoint,
        serverSeed: this.serverSeed,
        publicSeed: this.publicSeed,
      });

      this.metrics?.recordRoundCrash(this.currentRound.crashPoint);
      this.metrics?.roundPhase.set(3);

      this.logger.log(
        `Round ${this.currentRound.id} CRASHED at ${this.currentRound.crashPoint}x (${payouts.length} payouts)`,
      );

      this.currentRound = null;

      setTimeout(() => this.startNewRound(), this.COOLDOWN_MS);
    } catch (error) {
      this.logger.error(`Failed to crash round: ${error}`);
    }
  }

  private async processAutoCashouts(): Promise<void> {
    if (!this.currentRound) return;

    for (const [playerId, bet] of this.currentRound.bets) {
      if (
        bet.status === BetStatus.PENDING &&
        bet.autoCashoutAt !== null &&
        this.currentMultiplier >= bet.autoCashoutAt
      ) {
        try {
          const cashedBet = this.currentRound.cashOut(playerId, this.currentMultiplier);

          if (cashedBet.cashOutMultiplier != null && cashedBet.payoutCents != null) {
            await this.betRepo.updateCashOut(
              this.currentRound.id,
              playerId,
              cashedBet.cashOutMultiplier,
              cashedBet.payoutCents,
            );

            this.eventEmitter.emitBetCashedOut({
              playerId,
              multiplier: cashedBet.cashOutMultiplier,
              payoutCents: cashedBet.payoutCents,
            });

            this.logger.log(
              `Auto cashout for ${playerId} at ${cashedBet.cashOutMultiplier}x (target: ${bet.autoCashoutAt}x)`,
            );
          }
        } catch (error) {
          this.logger.warn(`Auto cashout failed for ${playerId}: ${error}`);
        }
      }
    }
  }

  getCurrentRound(): Round | null {
    return this.currentRound;
  }

  getCurrentMultiplier(): number {
    return this.currentMultiplier;
  }

  removeBetFromCurrentRound(playerId: string): void {
    if (!this.currentRound) return;
    this.currentRound.removeBet(playerId);
  }
}
