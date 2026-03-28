import { useGameSocket } from "@/hooks/use-game-socket";
import { MultiplierGraph } from "@/components/multiplier-graph";
import { BetControls } from "@/components/bet-controls";
import { BetList } from "@/components/bet-list";
import { RoundHistory } from "@/components/round-history";

export function GamePage() {
  useGameSocket();

  return (
    <div className="flex flex-1 flex-col">
      <RoundHistory />

      <div className="grid flex-1 gap-4 p-4 md:grid-cols-[1fr_360px]">
        <MultiplierGraph />

        <div className="flex flex-col gap-4">
          <BetControls />
          <BetList />
        </div>
      </div>
    </div>
  );
}
