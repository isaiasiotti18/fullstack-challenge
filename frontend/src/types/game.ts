export type GamePhase = "WAITING" | "BETTING" | "RUNNING" | "CRASHED";

export interface BetEntry {
  playerId: string;
  username: string;
  amountCents: number;
  status: "PENDING" | "CASHED_OUT" | "LOST";
  multiplier?: number;
  payoutCents?: number;
}
