export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
}

export class BetPlacedEvent implements DomainEvent {
  readonly eventName = "BetPlaced";
  readonly occurredAt: Date;

  constructor(
    readonly roundId: string,
    readonly playerId: string,
    readonly amountCents: number,
  ) {
    this.occurredAt = new Date();
  }
}

export class BetCashedOutEvent implements DomainEvent {
  readonly eventName = "BetCashedOut";
  readonly occurredAt: Date;

  constructor(
    readonly roundId: string,
    readonly playerId: string,
    readonly amountCents: number,
    readonly multiplier: number,
    readonly payoutCents: number,
  ) {
    this.occurredAt = new Date();
  }
}

export class RoundCrashedEvent implements DomainEvent {
  readonly eventName = "RoundCrashed";
  readonly occurredAt: Date;

  constructor(
    readonly roundId: string,
    readonly crashPoint: number,
    readonly losersCount: number,
    readonly totalLostCents: number,
  ) {
    this.occurredAt = new Date();
  }
}
