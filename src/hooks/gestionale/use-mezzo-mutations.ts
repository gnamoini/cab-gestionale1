"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { invalidateAfterMezzoMutations } from "@/src/lib/react-query/invalidate-related";
import { mezziService, type MezzoInsert, type MezzoUpdate } from "@/src/services/mezzi.service";

export function useMezzoCreateMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((data: MezzoInsert) => mezziService.create(data), {
    onSettled: async () => {
      await invalidateAfterMezzoMutations(queryClient);
    },
  });
}

export function useMezzoUpdateMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation(({ id, data }: { id: string; data: MezzoUpdate }) => mezziService.update(id, data), {
    onSettled: async () => {
      await invalidateAfterMezzoMutations(queryClient);
    },
  });
}
