import { Logger } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import type { GameEventEmitter } from "../../application/ports/game-event-emitter";

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
})
export class GameGateway
  implements GameEventEmitter, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server!: Server;

  afterInit(): void {
    this.logger.log("WebSocket gateway initialized");
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  emitBettingPhase(data: {
    roundId: string;
    startsAt: string;
    endsAt: string;
    hash: string;
  }): void {
    this.server.emit("round:betting", data);
  }

  emitRoundStart(data: { roundId: string; hash: string }): void {
    this.server.emit("round:start", data);
  }

  emitTick(data: { multiplier: number }): void {
    this.server.emit("round:tick", data);
  }

  emitCrash(data: {
    roundId: string;
    crashPoint: number;
    serverSeed: string;
    publicSeed: string;
  }): void {
    this.server.emit("round:crash", data);
  }

  emitBetPlaced(data: { playerId: string; amountCents: number }): void {
    this.server.emit("bet:placed", data);
  }

  emitBetCashedOut(data: { playerId: string; multiplier: number; payoutCents: number }): void {
    this.server.emit("bet:cashedOut", data);
  }
}
