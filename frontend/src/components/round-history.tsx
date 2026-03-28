import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/stores/game-store";
import { useRoundHistory } from "@/hooks/use-round-history";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function RoundHistory() {
  const queryClient = useQueryClient();
  const phase = useGameStore((s) => s.phase);
  const { data, isLoading } = useRoundHistory();

  useEffect(() => {
    if (phase === "CRASHED") {
      queryClient.invalidateQueries({ queryKey: ["rounds", "history"] });
    }
  }, [phase]);

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-14 shrink-0 rounded-full" />
        ))}
      </div>
    );
  }

  const rounds = data?.rounds ?? [];

  if (rounds.length === 0) {
    return (
      <div className="px-4 py-2">
        <p className="text-sm text-text-muted">Sem historico de rodadas</p>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2">
      {rounds.map((round) => (
        <Badge
          key={round.id}
          variant="outline"
          data-testid="round-badge"
          className={`shrink-0 font-mono text-xs ${
            round.crashPoint < 2 ? "border-crash/50 text-crash" : "border-neon/50 text-neon"
          }`}
        >
          {round.crashPoint.toFixed(2)}x
        </Badge>
      ))}
    </div>
  );
}
