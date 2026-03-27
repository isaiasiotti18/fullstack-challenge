export interface PlaceBetRequest {
  amountCents: number;
}

export interface PlaceBetResponse {
  roundId: string;
  playerId: string;
  amountCents: number;
  status: string;
}

export interface CashOutResponse {
  roundId: string;
  playerId: string;
  amountCents: number;
  status: string;
  multiplierAtCashout: number;
  payoutCents: number;
}

export interface RoundBet {
  playerId: string;
  amountCents: number;
  status: string;
  multiplierAtCashout: number | null;
  payoutCents: number | null;
  createdAt: string;
}

export interface CurrentRoundResponse {
  id: string;
  status: string;
  serverSeedHash: string;
  currentMultiplier: number;
  crashPoint: number | null;
  bets: RoundBet[];
}

export interface RoundHistoryItem {
  id: string;
  status: string;
  crashPoint: number;
  hash: string;
  createdAt: string;
}

export interface RoundHistoryResponse {
  rounds: RoundHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface VerifyRoundResponse {
  serverSeed: string;
  publicSeed: string;
  nonce: number;
  hash: string;
  crashPoint: number;
}

export interface PlayerBetItem {
  id: string;
  roundId: string;
  amountCents: number;
  status: string;
  multiplierAtCashout: number | null;
  payoutCents: number | null;
  createdAt: string;
}

export interface PlayerBetsResponse {
  bets: PlayerBetItem[];
  total: number;
  page: number;
  limit: number;
}

export interface WalletResponse {
  id: string;
  playerId: string;
  balanceCents: number;
}
