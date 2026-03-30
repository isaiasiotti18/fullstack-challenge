import { Injectable, OnModuleInit } from "@nestjs/common";
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly roundsTotal: Counter;
  readonly betsTotal: Counter;
  readonly betsAmountCents: Counter;
  readonly cashoutsTotal: Counter;
  readonly payoutsCents: Counter;
  readonly crashPointHistogram: Histogram;
  readonly wsLatency: Histogram;
  readonly activeConnections: Gauge;
  readonly roundPhase: Gauge;

  constructor() {
    this.registry.setDefaultLabels({ service: "games" });

    this.roundsTotal = new Counter({
      name: "crash_game_rounds_total",
      help: "Total number of completed rounds",
      registers: [this.registry],
    });

    this.betsTotal = new Counter({
      name: "crash_game_bets_total",
      help: "Total number of bets placed",
      registers: [this.registry],
    });

    this.betsAmountCents = new Counter({
      name: "crash_game_bets_amount_cents_total",
      help: "Total amount wagered in cents",
      registers: [this.registry],
    });

    this.cashoutsTotal = new Counter({
      name: "crash_game_cashouts_total",
      help: "Total number of cash outs",
      registers: [this.registry],
    });

    this.payoutsCents = new Counter({
      name: "crash_game_payouts_cents_total",
      help: "Total amount paid out in cents",
      registers: [this.registry],
    });

    this.crashPointHistogram = new Histogram({
      name: "crash_game_crash_point",
      help: "Distribution of crash points",
      buckets: [1.0, 1.2, 1.5, 2.0, 3.0, 5.0, 10.0, 20.0, 50.0, 100.0],
      registers: [this.registry],
    });

    this.wsLatency = new Histogram({
      name: "crash_game_ws_event_duration_seconds",
      help: "WebSocket event emission latency",
      labelNames: ["event"] as const,
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: "crash_game_ws_active_connections",
      help: "Number of active WebSocket connections",
      registers: [this.registry],
    });

    this.roundPhase = new Gauge({
      name: "crash_game_round_phase",
      help: "Current round phase (0=idle, 1=betting, 2=running, 3=crashed)",
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
  }

  recordBet(amountCents: number): void {
    this.betsTotal.inc();
    this.betsAmountCents.inc(amountCents);
  }

  recordCashout(payoutCents: number): void {
    this.cashoutsTotal.inc();
    this.payoutsCents.inc(payoutCents);
  }

  recordRoundCrash(crashPoint: number): void {
    this.roundsTotal.inc();
    this.crashPointHistogram.observe(crashPoint);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
