import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./infrastructure/auth/auth.module";
import { PrismaService } from "./infrastructure/database/prisma.service";
import { WalletRepositoryImpl } from "./infrastructure/database/wallet.repository.impl";
import { RabbitMQModule } from "./infrastructure/messaging/rabbitmq.module";
import { RabbitMQConsumer } from "./infrastructure/messaging/rabbitmq.consumer";
import { RabbitMQPublisher } from "./infrastructure/messaging/rabbitmq.publisher";
import { MetricsService } from "./infrastructure/metrics/metrics.service";
import { MetricsController } from "./infrastructure/metrics/metrics.controller";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { CreateWalletUseCase } from "./application/use-cases/create-wallet.use-case";
import { GetWalletUseCase } from "./application/use-cases/get-wallet.use-case";

@Module({
  imports: [ConfigModule.forRoot(), AuthModule, RabbitMQModule],
  controllers: [WalletsController, MetricsController],
  providers: [
    PrismaService,
    {
      provide: "WalletRepository",
      useClass: WalletRepositoryImpl,
    },
    CreateWalletUseCase,
    GetWalletUseCase,
    MetricsService,
    RabbitMQPublisher,
    RabbitMQConsumer,
  ],
})
export class AppModule {}
