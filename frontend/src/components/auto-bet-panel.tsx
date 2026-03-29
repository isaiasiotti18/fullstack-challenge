import { useAutoBetStore, type AutoBetStrategy } from "@/stores/auto-bet-store";
import { formatCents } from "@/services/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AutoBetPanel() {
  const {
    enabled,
    strategy,
    baseAmountCents,
    autoCashoutAt,
    stopLossCents,
    currentLossCents,
    currentBetCents,
    roundsPlayed,
    setEnabled,
    setStrategy,
    setBaseAmountCents,
    setAutoCashoutAt,
    setStopLossCents,
  } = useAutoBetStore();

  return (
    <Card className="border-border-game bg-bg-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">Auto Bet</span>
          <Button
            size="sm"
            variant={enabled ? "destructive" : "default"}
            onClick={() => setEnabled(!enabled)}
            className={enabled ? "" : "bg-neon text-bg-primary hover:bg-neon-hover"}
          >
            {enabled ? "Parar" : "Iniciar"}
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-text-secondary">Estratégia</label>
          <div className="flex gap-2">
            {(["fixed", "martingale"] as AutoBetStrategy[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={strategy === s ? "default" : "outline"}
                className="flex-1 text-xs capitalize"
                onClick={() => setStrategy(s)}
                disabled={enabled}
              >
                {s === "fixed" ? "Fixo" : "Martingale"}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-text-secondary">Valor Base (R$)</label>
          <Input
            type="number"
            min={1}
            max={1000}
            step="1"
            value={(baseAmountCents / 100).toFixed(2)}
            onChange={(e) => {
              const val = Math.round(parseFloat(e.target.value) * 100) || 100;
              setBaseAmountCents(Math.min(100_000, Math.max(100, val)));
            }}
            disabled={enabled}
            className="border-border-game bg-bg-secondary font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-text-secondary">Auto Cashout (x)</label>
          <Input
            type="number"
            min={1.01}
            step="0.1"
            placeholder="Ex: 2.00"
            value={autoCashoutAt ?? ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setAutoCashoutAt(val >= 1.01 ? val : null);
            }}
            disabled={enabled}
            className="border-border-game bg-bg-secondary font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-text-secondary">Stop Loss (R$)</label>
          <Input
            type="number"
            min={1}
            step="1"
            value={(stopLossCents / 100).toFixed(2)}
            onChange={(e) => {
              const val = Math.round(parseFloat(e.target.value) * 100) || 1000;
              setStopLossCents(Math.max(100, val));
            }}
            disabled={enabled}
            className="border-border-game bg-bg-secondary font-mono"
          />
        </div>

        {enabled && (
          <div className="space-y-1 rounded border border-border-game bg-bg-secondary p-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Próxima aposta:</span>
              <span className="font-mono text-text-primary">{formatCents(currentBetCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Perda acumulada:</span>
              <span className="font-mono text-red-400">{formatCents(currentLossCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Stop loss:</span>
              <span className="font-mono text-text-primary">{formatCents(stopLossCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Rodadas:</span>
              <span className="font-mono text-text-primary">{roundsPlayed}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
