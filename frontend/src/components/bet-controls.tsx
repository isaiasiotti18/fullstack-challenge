import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { useGameStore } from "@/stores/game-store";
import { usePlaceBet } from "@/hooks/use-place-bet";
import { useCashOut } from "@/hooks/use-cash-out";
import { formatCents } from "@/services/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const MIN_BET_REAIS = 1;
const MAX_BET_REAIS = 1000;

export function BetControls() {
  const [amountStr, setAmountStr] = useState("10");
  const auth = useAuth();
  const playerId = auth.user?.profile?.sub;

  const phase = useGameStore((s) => s.phase);
  const bets = useGameStore((s) => s.bets);
  const multiplier = useGameStore((s) => s.multiplier);

  const placeBet = usePlaceBet();
  const cashOutMutation = useCashOut();

  const amount = parseFloat(amountStr) || 0;
  const amountCents = Math.round(amount * 100);
  const hasBet = playerId ? bets.some((b) => b.playerId === playerId) : false;
  const playerBet = playerId ? bets.find((b) => b.playerId === playerId) : undefined;
  const canBet =
    phase === "BETTING" && !hasBet && amount >= MIN_BET_REAIS && amount <= MAX_BET_REAIS;
  const canCashOut = phase === "RUNNING" && playerBet?.status === "PENDING";

  function handlePlaceBet() {
    placeBet.mutate(
      { amountCents },
      {
        onSuccess: () => toast.success(`Aposta de ${formatCents(amountCents)} realizada`),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleCashOut() {
    cashOutMutation.mutate(undefined, {
      onSuccess: (data) =>
        toast.success(
          `Cash out de ${formatCents(data.payoutCents)} a ${data.multiplierAtCashout}x`,
        ),
      onError: (err) => toast.error(err.message),
    });
  }

  function adjustAmount(factor: number) {
    const next = Math.min(MAX_BET_REAIS, Math.max(MIN_BET_REAIS, amount * factor));
    setAmountStr(next.toFixed(2));
  }

  return (
    <Card className="border-border-game bg-bg-card">
      <CardContent className="space-y-3 p-4">
        <div className="space-y-2">
          <label className="text-sm text-text-secondary">Valor (R$)</label>
          <Input
            type="number"
            min={MIN_BET_REAIS}
            max={MAX_BET_REAIS}
            step="0.50"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            disabled={phase !== "BETTING" || hasBet}
            className="border-border-game bg-bg-secondary font-mono"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => adjustAmount(0.5)}
              disabled={phase !== "BETTING" || hasBet}
            >
              ½
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => adjustAmount(2)}
              disabled={phase !== "BETTING" || hasBet}
            >
              2×
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setAmountStr(MAX_BET_REAIS.toString())}
              disabled={phase !== "BETTING" || hasBet}
            >
              MAX
            </Button>
          </div>
        </div>

        {canCashOut ? (
          <Button
            className="w-full bg-neon text-bg-primary hover:bg-neon-hover"
            size="lg"
            onClick={handleCashOut}
            disabled={cashOutMutation.isPending}
          >
            {cashOutMutation.isPending
              ? "Sacando..."
              : `Cash Out ${formatCents(Math.floor(playerBet!.amountCents * multiplier))}`}
          </Button>
        ) : (
          <Button
            className="w-full"
            size="lg"
            onClick={handlePlaceBet}
            disabled={!canBet || placeBet.isPending}
          >
            {placeBet.isPending ? "Apostando..." : "Apostar"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
