import { InsufficientBalanceError, InvalidAmountError } from "./errors";

export interface WalletParams {
  id: string;
  playerId: string;
  balanceCents?: number;
}

export class Wallet {
  readonly id: string;
  readonly playerId: string;
  private _balanceCents: number;

  constructor(params: WalletParams) {
    const balance = params.balanceCents ?? 0;

    if (!Number.isInteger(balance) || balance < 0) {
      throw new InvalidAmountError(
        `Initial balance must be a non-negative integer, got ${balance}`,
      );
    }

    this.id = params.id;
    this.playerId = params.playerId;
    this._balanceCents = balance;
  }

  get balanceCents(): number {
    return this._balanceCents;
  }

  credit(amountCents: number): void {
    this.validatePositiveInteger(amountCents);
    this._balanceCents += amountCents;
  }

  debit(amountCents: number): void {
    this.validatePositiveInteger(amountCents);

    if (this._balanceCents < amountCents) {
      throw new InsufficientBalanceError(
        `Insufficient balance: have ${this._balanceCents} cents, tried to debit ${amountCents} cents`,
      );
    }

    this._balanceCents -= amountCents;
  }

  private validatePositiveInteger(amountCents: number): void {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new InvalidAmountError(`Amount must be a positive integer, got ${amountCents}`);
    }
  }
}
