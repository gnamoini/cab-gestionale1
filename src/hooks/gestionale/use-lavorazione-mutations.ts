"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { invalidateAfterLavorazioneMutations } from "@/src/lib/react-query/invalidate-related";
import {
  lavorazioniService,
  type LavorazioneInsert,
  type LavorazioneUpdate,
} from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";

export function useLavorazioneCreateMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((data: LavorazioneInsert) => lavorazioniService.create(data), {
    onSettled: async () => {
      await invalidateAfterLavorazioneMutations(queryClient);
    },
  });
}

export function useLavorazioneUpdateMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation(({ id, data }: { id: string; data: LavorazioneUpdate }) => lavorazioniService.update(id, data), {
    onSettled: async () => {
      await invalidateAfterLavorazioneMutations(queryClient);
    },
  });
}

export function useLavorazioneRemoveMutation() {
  const queryClient = useQueryClient();
  return useServiceMutation((id: string) => lavorazioniService.remove(id), {
    onSettled: async () => {
      await invalidateAfterLavorazioneMutations(queryClient);
    },
  });
}

export type LavorazioneUpdatePayload = { id: string; data: LavorazioneUpdate };

/** Tipo inferito per `onSuccess` UI (creazione). */
export type LavorazioneCreateResult = LavorazioneRow;
