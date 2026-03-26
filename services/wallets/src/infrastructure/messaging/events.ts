export interface BetPlacedMessage {
  eventId: string;
  roundId: string;
  playerId: string;
  amountCents: number;
  timestamp: string;
}

export interface RoundEndedMessage {
  eventId: string;
  roundId: string;
  crashPoint: number;
  payouts: Array<{ playerId: string; amountCents: number }>;
  timestamp: string;
}

export interface WalletDebitedMessage {
  eventId: string;
  roundId: string;
  playerId: string;
  amountCents: number;
  timestamp: string;
}

export interface WalletDebitFailedMessage {
  eventId: string;
  roundId: string;
  playerId: string;
  amountCents: number;
  reason: string;
  timestamp: string;
}

export const EXCHANGE_NAME = "crash-game-events";
export const GAMES_QUEUE = "games.wallet-events";
export const WALLETS_QUEUE = "wallets.game-events";
