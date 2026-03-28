export interface BettingPhaseEvent {
  roundId: string;
  startsAt: string;
  endsAt: string;
  hash: string;
}

export interface RoundStartEvent {
  roundId: string;
  hash: string;
}

export interface TickEvent {
  multiplier: number;
}

export interface CrashEvent {
  roundId: string;
  crashPoint: number;
  serverSeed: string;
  publicSeed: string;
}

export interface BetPlacedEvent {
  playerId: string;
  amountCents: number;
}

export interface BetCashedOutEvent {
  playerId: string;
  multiplier: number;
  payoutCents: number;
}

export interface BetRemovedEvent {
  playerId: string;
  reason: string;
}

export interface ServerToClientEvents {
  "round:betting": (data: BettingPhaseEvent) => void;
  "round:start": (data: RoundStartEvent) => void;
  "round:tick": (data: TickEvent) => void;
  "round:crash": (data: CrashEvent) => void;
  "bet:placed": (data: BetPlacedEvent) => void;
  "bet:cashedOut": (data: BetCashedOutEvent) => void;
  "bet:removed": (data: BetRemovedEvent) => void;
}
