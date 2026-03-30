import { Injectable, OnModuleInit } from "@nestjs/common";
import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly debitsTotal: Counter;
  readonly creditsTotal: Counter;
  readonly debitAmountCents: Counter;
  readonly creditAmountCents: Counter;
  readonly debitFailures: Counter;
  readonly eventProcessingDuration: Histogram;

  constructor() {
    this.registry.setDefaultLabels({ service: "wallets" });

    this.debitsTotal = new Counter({
      name: "wallet_debits_total",
      help: "Total number of wallet debits",
      registers: [this.registry],
    });

    this.creditsTotal = new Counter({
      name: "wallet_credits_total",
      help: "Total number of wallet credits",
      registers: [this.registry],
    });

    this.debitAmountCents = new Counter({
      name: "wallet_debit_amount_cents_total",
      help: "Total amount debited in cents",
      registers: [this.registry],
    });

    this.creditAmountCents = new Counter({
      name: "wallet_credit_amount_cents_total",
      help: "Total amount credited in cents",
      registers: [this.registry],
    });

    this.debitFailures = new Counter({
      name: "wallet_debit_failures_total",
      help: "Total number of failed wallet debits",
      labelNames: ["reason"] as const,
      registers: [this.registry],
    });

    this.eventProcessingDuration = new Histogram({
      name: "wallet_event_processing_duration_seconds",
      help: "Duration of message processing",
      labelNames: ["event_type"] as const,
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
