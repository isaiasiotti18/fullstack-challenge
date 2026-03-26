import { Bet, BetStatus } from "./bet";
import type { DomainEvent } from "./domain-event";
import { BetPlacedEvent, BetCashedOutEvent, RoundCrashedEvent } from "./domain-event";
import {
  InvalidRoundStateError,
  DuplicateBetError,
  BetNotFoundError,
  InvalidCashOutMultiplierError,
  InvalidBetStatusError,
} from "./errors";

export enum RoundStatus {
  BETTING = "BETTING",
  RUNNING = "RUNNING",
  CRASHED = "CRASHED",
}

export interface RoundParams {
  id: string;
  crashPoint: number;
  serverSeedHash: string;
}

export class Round {
  readonly id: string;
  readonly crashPoint: number;
  readonly serverSeedHash: string;
  private _status: RoundStatus;
  private _bets: Map<string, Bet>;
  private _domainEvents: DomainEvent[];

  constructor(params: RoundParams) {
    this.id = params.id;
    this.crashPoint = params.crashPoint;
    this.serverSeedHash = params.serverSeedHash;
    this._status = RoundStatus.BETTING;
    this._bets = new Map();
    this._domainEvents = [];
  }

  get status(): RoundStatus {
    return this._status;
  }

  get bets(): ReadonlyMap<string, Bet> {
    return this._bets;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  placeBet(playerId: string, amountCents: number): Bet {
    if (this._status !== RoundStatus.BETTING) {
      throw new InvalidRoundStateError(
        `Cannot place bet: round is ${this._status}, expected BETTING`,
      );
    }
    if (this._bets.has(playerId)) {
      throw new DuplicateBetError(`Player ${playerId} already has a bet in this round`);
    }

    const bet = new Bet(playerId, amountCents);
    this._bets.set(playerId, bet);

    this._domainEvents.push(new BetPlacedEvent(this.id, playerId, amountCents));

    return bet;
  }

  startRunning(): void {
    if (this._status !== RoundStatus.BETTING) {
      throw new InvalidRoundStateError(
        `Cannot start running: round is ${this._status}, expected BETTING`,
      );
    }
    this._status = RoundStatus.RUNNING;
  }

  cashOut(playerId: string, currentMultiplier: number): Bet {
    if (this._status !== RoundStatus.RUNNING) {
      throw new InvalidRoundStateError(
        `Cannot cash out: round is ${this._status}, expected RUNNING`,
      );
    }

    const bet = this._bets.get(playerId);
    if (!bet) {
      throw new BetNotFoundError(`Player ${playerId} has no bet in this round`);
    }

    if (bet.status !== BetStatus.PENDING) {
      throw new InvalidBetStatusError(
        `Cannot cash out: bet status is ${bet.status}, expected PENDING`,
      );
    }

    if (currentMultiplier > this.crashPoint) {
      throw new InvalidCashOutMultiplierError(
        `Cannot cash out at ${currentMultiplier}x: round crashes at ${this.crashPoint}x`,
      );
    }

    bet.cashOut(currentMultiplier);

    this._domainEvents.push(
      new BetCashedOutEvent(
        this.id,
        playerId,
        bet.amountCents,
        currentMultiplier,
        bet.payoutCents!,
      ),
    );

    return bet;
  }

  crash(): void {
    if (this._status !== RoundStatus.RUNNING) {
      throw new InvalidRoundStateError(`Cannot crash: round is ${this._status}, expected RUNNING`);
    }

    let losersCount = 0;
    let totalLostCents = 0;

    for (const bet of this._bets.values()) {
      if (bet.status === BetStatus.PENDING) {
        bet.markAsLost();
        losersCount++;
        totalLostCents += bet.amountCents;
      }
    }

    this._status = RoundStatus.CRASHED;

    this._domainEvents.push(
      new RoundCrashedEvent(this.id, this.crashPoint, losersCount, totalLostCents),
    );
  }
}
