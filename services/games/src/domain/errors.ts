export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidRoundStateError extends DomainError {}

export class DuplicateBetError extends DomainError {}

export class BetNotFoundError extends DomainError {}

export class InvalidBetAmountError extends DomainError {}

export class InvalidCashOutMultiplierError extends DomainError {}

export class InvalidBetStatusError extends DomainError {}

export class RoundNotFoundError extends DomainError {}
