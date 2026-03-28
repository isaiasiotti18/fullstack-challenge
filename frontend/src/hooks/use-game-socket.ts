import { useEffect } from "react";
import { connectSocket, disconnectSocket } from "@/services/socket";

export function useGameSocket(): void {
  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);
}
