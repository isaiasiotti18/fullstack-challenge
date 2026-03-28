import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { getPlayerBets } from "@/services/api";

export function usePlayerBets() {
  const auth = useAuth();

  return useQuery({
    queryKey: ["bets", "player"],
    queryFn: () => getPlayerBets(1, 20),
    enabled: auth.isAuthenticated,
    staleTime: 10_000,
  });
}
