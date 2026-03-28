import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { getWallet } from "@/services/api";

export function useWallet() {
  const auth = useAuth();

  return useQuery({
    queryKey: ["wallet"],
    queryFn: getWallet,
    enabled: auth.isAuthenticated,
    staleTime: 30_000,
  });
}
