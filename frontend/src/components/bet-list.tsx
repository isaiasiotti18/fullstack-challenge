import { useGameStore } from "@/stores/game-store";
import { formatCents } from "@/services/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BetList() {
  const bets = useGameStore((s) => s.bets);

  return (
    <Card className="border-border-game bg-bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-text-secondary">Apostas da Rodada</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[300px] overflow-y-auto p-4 pt-0">
        {bets.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">Nenhuma aposta ainda</p>
        ) : (
          <div className="space-y-1">
            {bets.map((bet) => (
              <div
                key={bet.playerId}
                data-testid="bet-entry"
                className="flex items-center justify-between rounded px-2 py-1.5 text-sm"
              >
                <span className="font-mono text-text-secondary">
                  {bet.username}
                </span>
                <span className="font-mono">{formatCents(bet.amountCents)}</span>
                <BetStatus
                  status={bet.status}
                  multiplier={bet.multiplier}
                  payoutCents={bet.payoutCents}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BetStatus({
  status,
  multiplier,
  payoutCents,
}: {
  status: string;
  multiplier?: number;
  payoutCents?: number;
}) {
  if (status === "CASHED_OUT") {
    return (
      <span className="font-mono text-neon" data-testid="bet-status">
        {multiplier?.toFixed(2)}x ({formatCents(payoutCents ?? 0)})
      </span>
    );
  }

  if (status === "LOST") {
    return <span className="font-mono text-crash" data-testid="bet-status">Perdeu</span>;
  }

  return <span className="font-mono text-text-muted" data-testid="bet-status">Pendente</span>;
}
