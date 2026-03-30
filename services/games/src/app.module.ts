import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./infrastructure/auth/auth.module";
import { RabbitMQModule } from "./infrastructure/messaging/rabbitmq.module";
import { PrismaService } from "./infrastructure/database/prisma.service";
import { PrismaRoundRepository } from "./infrastructure/database/round.repository.impl";
import { PrismaBetRepository } from "./infrastructure/database/bet.repository.impl";
import { RabbitMQConsumer } from "./infrastructure/messaging/rabbitmq.consumer";
import { OutboxPublisher } from "./infrastructure/messaging/outbox.publisher";
import { OutboxPollerService } from "./infrastructure/messaging/outbox-poller.service";
import { MetricsService } from "./infrastructure/metrics/metrics.service";
import { MetricsController } from "./infrastructure/metrics/metrics.controller";

import { GameLoopService } from "./application/services/game-loop.service";
import { PlaceBetUseCase } from "./application/use-cases/place-bet.use-case";
import { CashOutUseCase } from "./application/use-cases/cash-out.use-case";
import { GetCurrentRoundUseCase } from "./application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "./application/use-cases/get-round-history.use-case";
import { VerifyRoundUseCase } from "./application/use-cases/verify-round.use-case";
import { GetPlayerBetsUseCase } from "./application/use-cases/get-player-bets.use-case";
import { GetLeaderboardUseCase } from "./application/use-cases/get-leaderboard.use-case";

import { GamesController } from "./presentation/controllers/games.controller";
import { RoundsController } from "./presentation/controllers/rounds.controller";
import { BetController, BetsController } from "./presentation/controllers/bets.controller";
import { LeaderboardController } from "./presentation/controllers/leaderboard.controller";
import { GameGateway } from "./presentation/gateways/game.gateway";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RabbitMQModule],
  controllers: [
    GamesController,
    RoundsController,
    BetController,
    BetsController,
    LeaderboardController,
    MetricsController,
  ],
  providers: [
    PrismaService,

    // Repository bindings
    {
      provide: "RoundRepository",
      useClass: PrismaRoundRepository,
    },
    {
      provide: "BetRepository",
      useClass: PrismaBetRepository,
    },

    // Message publisher binding (transactional outbox pattern)
    {
      provide: "MessagePublisher",
      useClass: OutboxPublisher,
    },

    // WebSocket gateway
    GameGateway,
    {
      provide: "GameEventEmitter",
      useExisting: GameGateway,
    },

    // Metrics
    MetricsService,
    {
      provide: "MetricsService",
      useExisting: MetricsService,
    },

    // Application services
    GameLoopService,
    PlaceBetUseCase,
    CashOutUseCase,
    GetCurrentRoundUseCase,
    GetRoundHistoryUseCase,
    VerifyRoundUseCase,
    GetPlayerBetsUseCase,
    GetLeaderboardUseCase,

    // Outbox poller (publishes events from DB to RabbitMQ)
    OutboxPollerService,

    // Consumer
    RabbitMQConsumer,
  ],
})
export class AppModule {}
