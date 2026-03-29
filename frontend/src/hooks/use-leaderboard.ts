import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/services/api";
import type { LeaderboardPeriod } from "@/types/api";

export function useLeaderboard(period: LeaderboardPeriod) {
  return useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => getLeaderboard(period),
    refetchInterval: 30_000,
  });
}
