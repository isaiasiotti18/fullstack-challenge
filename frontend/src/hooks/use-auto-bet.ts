import { useEffect, useRef } from "react";
import { useAuth } from "react-oidc-context";
import { useGameStore } from "@/stores/game-store";
import { useAutoBetStore } from "@/stores/auto-bet-store";
import { placeBet } from "@/services/api";
import { toast } from "sonner";

export function useAutoBet() {
  const auth = useAuth();
  const pendingRef = useRef(false);
  const prevPhaseRef = useRef<string>("");

  useEffect(() => {
    const unsubGame = useGameStore.subscribe((state, prev) => {
      const autoBet = useAutoBetStore.getState();
      if (!autoBet.enabled || !auth.user?.access_token) return;

      // On crash: record win/loss
      if (state.phase === "CRASHED" && prev.phase === "RUNNING") {
        const playerId = auth.user?.profile?.sub;
        if (!playerId) return;

        const playerBet = prev.bets.find((b) => b.playerId === playerId);
        if (playerBet) {
          if (playerBet.status === "CASHED_OUT") {
            autoBet.recordWin();
          } else {
            autoBet.recordLoss(playerBet.amountCents);
          }
        }
      }

      // On betting phase: place auto bet
      if (state.phase === "BETTING" && prevPhaseRef.current !== "BETTING" && !pendingRef.current) {
        const currentAutoBet = useAutoBetStore.getState();
        if (!currentAutoBet.enabled) return;

        pendingRef.current = true;

        setTimeout(async () => {
          try {
            const latestAutoBet = useAutoBetStore.getState();
            if (!latestAutoBet.enabled) return;

            await placeBet({
              amountCents: latestAutoBet.currentBetCents,
              autoCashoutAt: latestAutoBet.autoCashoutAt ?? undefined,
            });

            toast.success(
              `Auto bet: R$ ${(latestAutoBet.currentBetCents / 100).toFixed(2)}` +
                (latestAutoBet.autoCashoutAt ? ` (cashout @ ${latestAutoBet.autoCashoutAt}x)` : ""),
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Erro no auto bet";
            toast.error(msg);
            useAutoBetStore.getState().setEnabled(false);
          } finally {
            pendingRef.current = false;
          }
        }, 500);
      }

      prevPhaseRef.current = state.phase;
    });

    return () => unsubGame();
  }, [auth.user?.access_token, auth.user?.profile?.sub]);
}
