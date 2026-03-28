import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWallet } from "@/services/api";

export function useCreateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
