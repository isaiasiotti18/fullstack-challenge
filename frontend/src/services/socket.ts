import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import type { ServerToClientEvents } from "@/types/socket";
import { useGameStore } from "@/stores/game-store";

const SOCKET_URL = "http://localhost:8000";

let socket: Socket<ServerToClientEvents> | null = null;

export function connectSocket(): void {
  if (socket?.connected) return;

  socket = io(SOCKET_URL, {
    path: "/ws/socket.io",
    transports: ["websocket"],
    autoConnect: false,
  });

  socket.on("round:betting", (data) => useGameStore.getState().setBettingPhase(data));
  socket.on("round:start", (data) => useGameStore.getState().setRoundStart(data));
  socket.on("round:tick", (data) => useGameStore.getState().setTick(data.multiplier));
  socket.on("round:crash", (data) => useGameStore.getState().setCrash(data));
  socket.on("bet:placed", (data) => useGameStore.getState().addBet(data));
  socket.on("bet:cashedOut", (data) => useGameStore.getState().addCashOut(data));
  socket.on("bet:removed", (data) => {
    useGameStore.getState().removeBet(data);
    toast.error(`Aposta rejeitada: ${data.reason}`);
  });

  socket.connect();
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
