import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { RabbitMQService } from "./rabbitmq.service";

@Injectable()
export class OutboxPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPollerService.name);
  private interval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private readonly POLL_INTERVAL_MS = 1_000;
  private readonly BATCH_SIZE = 50;
  private readonly RETENTION_HOURS = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  onModuleInit(): void {
    this.logger.log("Outbox poller starting...");

    this.interval = setInterval(() => this.pollAndPublish(), this.POLL_INTERVAL_MS);

    this.cleanupInterval = setInterval(() => this.cleanupPublished(), 60 * 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private async pollAndPublish(): Promise<void> {
    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: { publishedAt: null },
        orderBy: { createdAt: "asc" },
        take: this.BATCH_SIZE,
      });

      if (events.length === 0) return;

      for (const event of events) {
        try {
          await this.rabbitmq.publish(event.routingKey, event.payload as object);

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { publishedAt: new Date() },
          });

          this.logger.debug(`Outbox: published ${event.routingKey} (${event.id})`);
        } catch (error) {
          this.logger.error(
            `Outbox: failed to publish ${event.routingKey} (${event.id}): ${error}`,
          );
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Outbox poller error: ${error}`);
    }
  }

  private async cleanupPublished(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - this.RETENTION_HOURS * 60 * 60 * 1000);
      const result = await this.prisma.outboxEvent.deleteMany({
        where: {
          publishedAt: { not: null, lt: cutoff },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Outbox: cleaned up ${result.count} published events`);
      }
    } catch (error) {
      this.logger.error(`Outbox cleanup error: ${error}`);
    }
  }
}
