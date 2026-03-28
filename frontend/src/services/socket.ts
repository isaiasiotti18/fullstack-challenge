import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents } from "@/types/socket";
import { useGameStore } from "@/stores/game-store";

const SOCKET_URL = "http://localhost:4001";

let socket: Socket<ServerToClientEvents> | null = null;

export function connectSocket(): void {
  if (socket?.connected) return;

  const store = useGameStore.getState();

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: false,
  });

  socket.on("round:betting", store.setBettingPhase);
  socket.on("round:start", store.setRoundStart);
  socket.on("round:tick", (data) => useGameStore.getState().setTick(data.multiplier));
  socket.on("round:crash", store.setCrash);
  socket.on("bet:placed", store.addBet);
  socket.on("bet:cashedOut", store.addCashOut);

  socket.connect();
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
