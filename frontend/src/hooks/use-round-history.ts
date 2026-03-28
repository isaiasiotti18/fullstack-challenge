import { useQuery } from "@tanstack/react-query";
import { getRoundHistory } from "@/services/api";

export function useRoundHistory() {
  return useQuery({
    queryKey: ["rounds", "history"],
    queryFn: () => getRoundHistory(1, 20),
    staleTime: 10_000,
  });
}
