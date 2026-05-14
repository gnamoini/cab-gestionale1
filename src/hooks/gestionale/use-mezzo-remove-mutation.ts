"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { invalidateAfterMezzoMutations } from "@/src/lib/react-query/invalidate-related";
import { mezziService } from "@/src/services/mezzi.service";

/** Eliminazione mezzo con invalidazione coerente (mezzi, lavorazioni, preventivi, documenti). */
export function useMezzoRemoveMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((id: string) => mezziService.remove(id), {
    onSettled: async () => {
      await invalidateAfterMezzoMutations(queryClient);
    },
  });
}
