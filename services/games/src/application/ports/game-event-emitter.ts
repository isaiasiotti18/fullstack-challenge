export interface GameEventEmitter {
  emitBettingPhase(data: { roundId: string; startsAt: string; endsAt: string; hash: string }): void;

  emitRoundStart(data: { roundId: string; hash: string }): void;

  emitTick(data: { multiplier: number }): void;

  emitCrash(data: {
    roundId: string;
    crashPoint: number;
    serverSeed: string;
    publicSeed: string;
  }): void;

  emitBetPlaced(data: { playerId: string; amountCents: number }): void;

  emitBetCashedOut(data: { playerId: string; multiplier: number; payoutCents: number }): void;

  emitBetRemoved(data: { playerId: string; reason: string }): void;
}
