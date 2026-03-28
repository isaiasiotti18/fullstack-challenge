import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeBet } from "@/services/api";
import type { PlaceBetRequest } from "@/types/api";

export function usePlaceBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PlaceBetRequest) => placeBet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
