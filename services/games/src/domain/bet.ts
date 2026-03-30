import { InvalidBetAmountError, InvalidBetStatusError } from "./errors";

export enum BetStatus {
  PENDING = "PENDING",
  CASHED_OUT = "CASHED_OUT",
  LOST = "LOST",
}

export class Bet {
  static readonly MIN_AMOUNT_CENTS = 100;
  static readonly MAX_AMOUNT_CENTS = 100_000;

  readonly playerId: string;
  readonly amountCents: number;
  readonly autoCashoutAt: number | null;
  private _status: BetStatus;
  private _cashOutMultiplier: number | null;
  private _payoutCents: number | null;

  constructor(playerId: string, amountCents: number, autoCashoutAt?: number | null) {
    if (!Number.isInteger(amountCents)) {
      throw new InvalidBetAmountError(`Bet amount must be an integer, got ${amountCents}`);
    }

    if (amountCents < Bet.MIN_AMOUNT_CENTS) {
      throw new InvalidBetAmountError(
        `Bet amount must be at least ${Bet.MIN_AMOUNT_CENTS} cents, got ${amountCents}`,
      );
    }

    if (amountCents > Bet.MAX_AMOUNT_CENTS) {
      throw new InvalidBetAmountError(
        `Bet amount must be at most ${Bet.MAX_AMOUNT_CENTS} cents, got ${amountCents}`,
      );
    }

    if (autoCashoutAt != null && autoCashoutAt < 1.01) {
      throw new InvalidBetAmountError(
        `Auto cashout multiplier must be >= 1.01, got ${autoCashoutAt}`,
      );
    }

    this.playerId = playerId;
    this.amountCents = amountCents;
    this.autoCashoutAt = autoCashoutAt ?? null;
    this._status = BetStatus.PENDING;
    this._cashOutMultiplier = null;
    this._payoutCents = null;
  }

  get status(): BetStatus {
    return this._status;
  }

  get cashOutMultiplier(): number | null {
    return this._cashOutMultiplier;
  }

  get payoutCents(): number | null {
    return this._payoutCents;
  }

  cashOut(multiplier: number): void {
    if (this._status !== BetStatus.PENDING) {
      throw new InvalidBetStatusError(`Cannot cash out bet with status ${this._status}`);
    }
    if (multiplier < 1.0) {
      throw new InvalidBetStatusError(`Cash out multiplier must be >= 1.0, got ${multiplier}`);
    }

    this._cashOutMultiplier = multiplier;
    this._payoutCents = Math.floor(this.amountCents * multiplier);
    this._status = BetStatus.CASHED_OUT;
  }

  shouldAutoCashout(currentMultiplier: number): boolean {
    return (
      this._status === BetStatus.PENDING &&
      this.autoCashoutAt !== null &&
      currentMultiplier >= this.autoCashoutAt
    );
  }

  markAsLost(): void {
    if (this._status !== BetStatus.PENDING) {
      throw new InvalidBetStatusError(`Cannot mark bet as lost with status ${this._status}`);
    }
    this._status = BetStatus.LOST;
  }
}
