import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Round, RoundStatus } from "../../domain/round";
import { GameEngine } from "../../domain/services/game-engine";
import type { RoundRepository } from "../ports/round.repository";
import type { BetRepository } from "../ports/bet.repository";
import type { MessagePublisher } from "../ports/message-publisher";
import type { GameEventEmitter } from "../ports/game-event-emitter";
import type { Clock } from "../ports/clock";
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

  constructor(
    @Inject("RoundRepository") private readonly roundRepo: RoundRepository,
    @Inject("BetRepository") private readonly betRepo: BetRepository,
    @Inject("MessagePublisher") private readonly publisher: MessagePublisher,
    @Inject("GameEventEmitter") private readonly eventEmitter: GameEventEmitter,
    @Inject("Clock") private readonly clock: Clock,
    @Inject("GameEngine") private readonly gameEngine: GameEngine,
    @Inject("MetricsService") private readonly metrics: MetricsService | null,
  ) {}

  onModuleDestroy(): void {
    this.shuttingDown = true;
    if (this.tickInterval) {
      this.clock.clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.currentRound = null;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log("Game loop initializing, starting first round in 2s...");
    this.clock.setTimeout(() => this.startNewRound(), 2000);
  }

  private async startNewRound(): Promise<void> {
    if (this.shuttingDown) return;

    try {
      this.serverSeed = randomUUID() + randomUUID();
      this.publicSeed = randomUUID();
      this.nonce++;

      let { crashPoint, hash } = this.gameEngine.generateRoundParams(
        this.serverSeed,
        this.publicSeed,
        this.nonce,
      );

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

      this.currentRound = new Round({
        id: randomUUID(),
        crashPoint,
        serverSeedHash: hash,
      });
      this.currentMultiplier = 1.0;

      await this.roundRepo.save(this.currentRound, this.serverSeed, this.publicSeed, this.nonce);

      const now = this.clock.now();
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

      this.clock.setTimeout(() => this.startRunning(), this.BETTING_DURATION_MS);
    } catch (error) {
      this.logger.error(`Failed to start new round: ${error}`);
      this.clock.setTimeout(() => this.startNewRound(), this.COOLDOWN_MS);
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

      this.roundStartTime = this.clock.now();
      this.tickInterval = this.clock.setInterval(() => this.tick(), this.TICK_INTERVAL_MS);
    } catch (error) {
      this.logger.error(`Failed to start running: ${error}`);
    }
  }

  private async tick(): Promise<void> {
    if (!this.currentRound) return;

    try {
      const elapsed = (this.clock.now() - this.roundStartTime) / 1000;
      this.currentMultiplier = this.gameEngine.calculateCurrentMultiplier(elapsed);

      if (this.gameEngine.shouldCrash(this.currentMultiplier, this.currentRound.crashPoint)) {
        this.currentMultiplier = this.currentRound.crashPoint;
        await this.crashRound();
      } else {
        await this.processAutoCashouts();
        this.eventEmitter.emitTick({ multiplier: this.currentMultiplier });
      }
    } catch (error) {
      this.logger.error(`Tick error, forcing crash: ${error}`);
      if (this.tickInterval) {
        this.clock.clearInterval(this.tickInterval);
        this.tickInterval = null;
      }
      await this.crashRound();
    }
  }

  private async crashRound(): Promise<void> {
    if (!this.currentRound || this.tickInterval === null) return;

    this.clock.clearInterval(this.tickInterval);
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

      this.clock.setTimeout(() => this.startNewRound(), this.COOLDOWN_MS);
    } catch (error) {
      this.logger.error(`Failed to crash round: ${error}`);
    }
  }

  private async processAutoCashouts(): Promise<void> {
    if (!this.currentRound) return;

    const results = this.gameEngine.processAutoCashouts(this.currentRound, this.currentMultiplier);

    for (const result of results) {
      try {
        await this.betRepo.updateCashOut(
          this.currentRound.id,
          result.playerId,
          result.multiplier,
          result.payoutCents,
        );

        this.eventEmitter.emitBetCashedOut({
          playerId: result.playerId,
          multiplier: result.multiplier,
          payoutCents: result.payoutCents,
        });

        this.logger.log(`Auto cashout for ${result.playerId} at ${result.multiplier}x`);
      } catch (error) {
        this.logger.warn(`Auto cashout persistence failed for ${result.playerId}: ${error}`);
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
