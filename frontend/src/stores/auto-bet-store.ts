import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AutoBetStrategy = "fixed" | "martingale";

interface AutoBetState {
  enabled: boolean;
  strategy: AutoBetStrategy;
  baseAmountCents: number;
  autoCashoutAt: number | null;
  stopLossCents: number;
  currentLossCents: number;
  currentBetCents: number;
  roundsPlayed: number;

  setEnabled: (enabled: boolean) => void;
  setStrategy: (strategy: AutoBetStrategy) => void;
  setBaseAmountCents: (amount: number) => void;
  setAutoCashoutAt: (multiplier: number | null) => void;
  setStopLossCents: (amount: number) => void;
  recordWin: () => void;
  recordLoss: (lostCents: number) => void;
  reset: () => void;
}

export const useAutoBetStore = create<AutoBetState>()(
  persist(
    (set, get) => ({
      enabled: false,
      strategy: "fixed",
      baseAmountCents: 1000,
      autoCashoutAt: 2.0,
      stopLossCents: 10000,
      currentLossCents: 0,
      currentBetCents: 1000,
      roundsPlayed: 0,

      setEnabled: (enabled) => {
        if (enabled) {
          set({
            enabled,
            currentLossCents: 0,
            currentBetCents: get().baseAmountCents,
            roundsPlayed: 0,
          });
        } else {
          set({ enabled });
        }
      },

      setStrategy: (strategy) => set({ strategy }),
      setBaseAmountCents: (amount) => set({ baseAmountCents: amount, currentBetCents: amount }),
      setAutoCashoutAt: (multiplier) => set({ autoCashoutAt: multiplier }),
      setStopLossCents: (amount) => set({ stopLossCents: amount }),

      recordWin: () => {
        const state = get();
        set({
          currentBetCents: state.baseAmountCents,
          currentLossCents: 0,
          roundsPlayed: state.roundsPlayed + 1,
        });
      },

      recordLoss: (lostCents) => {
        const state = get();
        const newLoss = state.currentLossCents + lostCents;
        const nextBet =
          state.strategy === "martingale" ? state.currentBetCents * 2 : state.baseAmountCents;

        if (newLoss >= state.stopLossCents) {
          set({
            enabled: false,
            currentLossCents: newLoss,
            roundsPlayed: state.roundsPlayed + 1,
          });
          return;
        }

        set({
          currentBetCents: Math.min(nextBet, 100_000),
          currentLossCents: newLoss,
          roundsPlayed: state.roundsPlayed + 1,
        });
      },

      reset: () =>
        set({
          enabled: false,
          currentLossCents: 0,
          currentBetCents: 1000,
          roundsPlayed: 0,
        }),
    }),
    {
      name: "auto-bet-settings",
      partialize: (state) => ({
        strategy: state.strategy,
        baseAmountCents: state.baseAmountCents,
        autoCashoutAt: state.autoCashoutAt,
        stopLossCents: state.stopLossCents,
      }),
    },
  ),
);
