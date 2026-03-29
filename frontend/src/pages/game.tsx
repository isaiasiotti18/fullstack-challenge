import { useGameSocket } from "@/hooks/use-game-socket";
import { useAutoBet } from "@/hooks/use-auto-bet";
import { useGameStore } from "@/stores/game-store";
import { MultiplierGraph } from "@/components/multiplier-graph";
import { BetControls } from "@/components/bet-controls";
import { AutoBetPanel } from "@/components/auto-bet-panel";
import { BetList } from "@/components/bet-list";
import { Leaderboard } from "@/components/leaderboard";
import { RoundHistory } from "@/components/round-history";

export function GamePage() {
  useGameSocket();
  useAutoBet();

  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);
  const roundId = useGameStore((s) => s.roundId);
  const crashPoint = useGameStore((s) => s.crashPoint);

  return (
    <div className="flex flex-1 flex-col">
      <span
        data-testid="game-phase"
        data-phase={phase}
        data-multiplier={multiplier}
        data-round-id={roundId ?? ""}
        data-crash-point={crashPoint ?? ""}
        className="hidden"
      />

      <RoundHistory />

      <div className="grid flex-1 gap-4 p-4 md:grid-cols-[1fr_360px]">
        <MultiplierGraph />

        <div className="flex flex-col gap-4">
          <BetControls />
          <AutoBetPanel />
          <BetList />
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}
