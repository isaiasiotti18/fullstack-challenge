import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import type { QueryClient } from "@tanstack/react-query";
import type { ServerToClientEvents } from "@/types/socket";
import { useGameStore } from "@/stores/game-store";
import { getCurrentRound } from "@/services/api";

const SOCKET_URL = "/";

let socket: Socket<ServerToClientEvents> | null = null;
let queryClientRef: QueryClient | null = null;

export function setQueryClient(qc: QueryClient): void {
  queryClientRef = qc;
}

function invalidateWallet(): void {
  queryClientRef?.invalidateQueries({ queryKey: ["wallet"] });
}

export function connectSocket(): void {
  if (socket?.connected) return;

  socket = io(SOCKET_URL, {
    path: "/ws/socket.io",
    transports: ["websocket"],
    autoConnect: false,
  });

  socket.on("round:betting", (data) => {
    useGameStore.getState().setBettingPhase(data);
    invalidateWallet();
  });
  socket.on("round:start", (data) => useGameStore.getState().setRoundStart(data));
  socket.on("round:tick", (data) => useGameStore.getState().setTick(data.multiplier));
  socket.on("round:crash", (data) => {
    useGameStore.getState().setCrash(data);
    invalidateWallet();
  });
  socket.on("bet:placed", (data) => useGameStore.getState().addBet(data));
  socket.on("bet:cashedOut", (data) => {
    useGameStore.getState().addCashOut(data);
    invalidateWallet();
  });
  socket.on("bet:removed", (data) => {
    useGameStore.getState().removeBet(data);
    invalidateWallet();
    toast.error(`Aposta rejeitada: ${data.reason}`);
  });

  // Fetch current round state on connect to sync mid-round joins
  socket.on("connect", async () => {
    try {
      const round = await getCurrentRound();
      if (!round) return;
      const store = useGameStore.getState();
      if (store.phase !== "WAITING") return;

      const hash = round.serverSeedHash;

      if (round.status === "BETTING") {
        store.setBettingPhase({
          roundId: round.id,
          startsAt: round.createdAt ?? new Date().toISOString(),
          endsAt: round.bettingEndsAt ?? "",
          hash,
        });
      } else if (round.status === "RUNNING") {
        store.setRoundStart({ roundId: round.id, hash });
        store.setTick(round.currentMultiplier);
      }

      if (round.bets?.length) {
        for (const bet of round.bets) {
          store.addBet({ playerId: bet.playerId, username: bet.playerId.slice(0, 8), amountCents: bet.amountCents });
          if (bet.status === "CASHED_OUT" && bet.multiplierAtCashout && bet.payoutCents) {
            store.addCashOut({
              playerId: bet.playerId,
              multiplier: bet.multiplierAtCashout,
              payoutCents: bet.payoutCents,
            });
          }
        }
      }
    } catch {
      // Will sync on next event
    }
  });

  socket.connect();
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
