import { create } from "zustand";
import type { GamePhase, BetEntry } from "@/types/game";
import type {
  BettingPhaseEvent,
  RoundStartEvent,
  CrashEvent,
  BetPlacedEvent,
  BetCashedOutEvent,
} from "@/types/socket";

interface GameState {
  phase: GamePhase;
  roundId: string | null;
  multiplier: number;
  crashPoint: number | null;
  hash: string | null;
  bettingEndsAt: string | null;
  bets: BetEntry[];
  serverSeed: string | null;
  publicSeed: string | null;

  setBettingPhase: (data: BettingPhaseEvent) => void;
  setRoundStart: (data: RoundStartEvent) => void;
  setTick: (multiplier: number) => void;
  setCrash: (data: CrashEvent) => void;
  addBet: (data: BetPlacedEvent) => void;
  addCashOut: (data: BetCashedOutEvent) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: "WAITING",
  roundId: null,
  multiplier: 1.0,
  crashPoint: null,
  hash: null,
  bettingEndsAt: null,
  bets: [],
  serverSeed: null,
  publicSeed: null,

  setBettingPhase: (data) =>
    set({
      phase: "BETTING",
      roundId: data.roundId,
      hash: data.hash,
      bettingEndsAt: data.endsAt,
      multiplier: 1.0,
      crashPoint: null,
      bets: [],
      serverSeed: null,
      publicSeed: null,
    }),

  setRoundStart: (data) =>
    set({
      phase: "RUNNING",
      roundId: data.roundId,
      hash: data.hash,
    }),

  setTick: (multiplier) => set({ multiplier }),

  setCrash: (data) =>
    set((state) => ({
      phase: "CRASHED",
      crashPoint: data.crashPoint,
      multiplier: data.crashPoint,
      serverSeed: data.serverSeed,
      publicSeed: data.publicSeed,
      bets: state.bets.map((bet) =>
        bet.status === "PENDING" ? { ...bet, status: "LOST" as const } : bet,
      ),
    })),

  addBet: (data) =>
    set((state) => ({
      bets: [...state.bets, { ...data, status: "PENDING" as const }],
    })),

  addCashOut: (data) =>
    set((state) => ({
      bets: state.bets.map((bet) =>
        bet.playerId === data.playerId
          ? {
              ...bet,
              status: "CASHED_OUT" as const,
              multiplier: data.multiplier,
              payoutCents: data.payoutCents,
            }
          : bet,
      ),
    })),

  reset: () =>
    set({
      phase: "WAITING",
      roundId: null,
      multiplier: 1.0,
      crashPoint: null,
      hash: null,
      bettingEndsAt: null,
      bets: [],
      serverSeed: null,
      publicSeed: null,
    }),
}));
