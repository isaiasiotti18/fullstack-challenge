import { useEffect, useRef } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSound } from "@/hooks/use-sound";

export function useGameSounds() {
  const { play } = useSound();
  const prevPhaseRef = useRef<string>("");
  const prevBetCountRef = useRef<number>(0);
  const prevCashoutCountRef = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, prev) => {
      // Crash sound
      if (state.phase === "CRASHED" && prev.phase === "RUNNING") {
        play("crash");
      }

      // Betting phase countdown tick (last 3 seconds handled by UI)
      if (state.phase === "BETTING" && prevPhaseRef.current !== "BETTING") {
        play("tick");
      }

      // New bet placed
      const currentBetCount = state.bets.length;
      if (currentBetCount > prevBetCountRef.current && state.phase === "BETTING") {
        play("bet");
      }
      prevBetCountRef.current = currentBetCount;

      // Cashout detected
      const currentCashouts = state.bets.filter((b) => b.status === "CASHED_OUT").length;
      if (currentCashouts > prevCashoutCountRef.current && state.phase === "RUNNING") {
        play("cashout");
      }
      prevCashoutCountRef.current = currentCashouts;

      prevPhaseRef.current = state.phase;
    });

    return () => unsubscribe();
  }, [play]);
}
