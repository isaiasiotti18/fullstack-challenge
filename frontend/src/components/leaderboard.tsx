import { useState } from "react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { formatCents, truncatePlayerId } from "@/services/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaderboardPeriod } from "@/types/api";

const periods: { value: LeaderboardPeriod; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 dias" },
];

export function Leaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("24h");
  const { data, isLoading } = useLeaderboard(period);

  return (
    <Card className="border-border-game bg-bg-card">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">Leaderboard</span>
          <div className="flex gap-1">
            {periods.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={period === p.value ? "default" : "outline"}
                className="h-6 px-2 text-xs"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <p className="py-4 text-center text-xs text-text-secondary">
            Nenhum dado para este período
          </p>
        ) : (
          <div className="space-y-1">
            {data.map((entry, i) => (
              <div
                key={entry.playerId}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-bg-secondary"
              >
                <span
                  className={`w-5 text-center font-bold ${
                    i === 0
                      ? "text-yellow-400"
                      : i === 1
                        ? "text-gray-300"
                        : i === 2
                          ? "text-amber-600"
                          : "text-text-secondary"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-mono text-text-primary">
                  {truncatePlayerId(entry.playerId)}
                </span>
                <span className="text-text-secondary">{entry.totalBets} apostas</span>
                <span
                  className={`font-mono font-bold ${
                    entry.netProfitCents >= 0 ? "text-neon" : "text-red-400"
                  }`}
                >
                  {entry.netProfitCents >= 0 ? "+" : ""}
                  {formatCents(entry.netProfitCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
