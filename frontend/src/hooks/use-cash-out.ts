import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cashOut } from "@/services/api";

export function useCashOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cashOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
