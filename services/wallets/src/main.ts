import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { DomainExceptionFilter } from "./presentation/filters/domain-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle("Wallet Service")
    .setDescription("Crash Game - Wallet Service API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableCors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" });

  const port = process.env.PORT ?? 4002;
  await app.listen(port, "0.0.0.0");
  console.log(`Wallets service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
