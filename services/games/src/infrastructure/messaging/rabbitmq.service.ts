import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqp from "amqplib";
import { EXCHANGE_NAME, GAMES_QUEUE } from "./events";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;
const ROUTING_KEYS = ["wallet.debited", "wallet.debit_failed"];

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  private async connect(): Promise<void> {
    const url = this.configService.get<string>("RABBITMQ_URL", "amqp://admin:admin@localhost:5672");

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.connection = await amqp.connect(url);
        this.channel = await this.connection.createChannel();

        await this.channel.assertExchange(EXCHANGE_NAME, "topic", {
          durable: true,
        });

        await this.channel.assertQueue(GAMES_QUEUE, { durable: true });

        for (const key of ROUTING_KEYS) {
          await this.channel.bindQueue(GAMES_QUEUE, EXCHANGE_NAME, key);
        }

        this.connection.on("error", (err) => {
          this.logger.error(`RabbitMQ connection error: ${err.message}`);
        });

        this.connection.on("close", () => {
          this.logger.warn("RabbitMQ connection closed");
          this.connection = null;
          this.channel = null;
        });

        this.logger.log(
          `Connected to RabbitMQ. Queue "${GAMES_QUEUE}" bound to exchange "${EXCHANGE_NAME}" with keys: [${ROUTING_KEYS.join(", ")}]`,
        );
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `RabbitMQ connection attempt ${attempt}/${MAX_RETRIES} failed: ${message}`,
        );

        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS);
        }
      }
    }

    this.logger.error(
      `Failed to connect to RabbitMQ after ${MAX_RETRIES} attempts. Service will continue without messaging.`,
    );
  }

  async publish(routingKey: string, message: object): Promise<void> {
    if (!this.channel) {
      this.logger.error(`Cannot publish to "${routingKey}": channel not available`);
      return;
    }

    const buffer = Buffer.from(JSON.stringify(message));

    this.channel.publish(EXCHANGE_NAME, routingKey, buffer, {
      persistent: true,
      contentType: "application/json",
    });

    this.logger.debug(`Published message to "${routingKey}"`);
  }

  async consume(callback: (routingKey: string, message: unknown) => Promise<void>): Promise<void> {
    if (!this.channel) {
      this.logger.error("Cannot consume: channel not available");
      return;
    }

    await this.channel.consume(
      GAMES_QUEUE,
      async (msg) => {
        if (!msg) return;

        const routingKey = msg.fields.routingKey;

        try {
          const content = JSON.parse(msg.content.toString());
          await callback(routingKey, content);
          this.channel!.ack(msg);
          this.logger.debug(`Processed message from "${routingKey}" successfully`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error processing message from "${routingKey}": ${errorMessage}`);
          this.channel!.nack(msg, false, false);
        }
      },
      { noAck: false },
    );

    this.logger.log(`Consuming messages from queue "${GAMES_QUEUE}"`);
  }

  getChannel(): amqp.Channel | null {
    return this.channel;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.logger.log("RabbitMQ connection closed gracefully");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error closing RabbitMQ connection: ${message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
