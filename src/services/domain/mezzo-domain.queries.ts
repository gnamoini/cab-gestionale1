"use client";

import { useMemo } from "react";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { documentiService } from "@/src/services/documenti.service";
import {
  lavorazioniDomainQueryKeys,
  stableLavorazioniFiltersKey,
} from "@/src/services/domain/lavorazioni-domain.queries";
import { lavorazioniService, type LavorazioneFilters } from "@/src/services/lavorazioni.service";
import { logService } from "@/src/services/log.service";
import { mezziService } from "@/src/services/mezzi.service";
import { movimentiService } from "@/src/services/movimenti.service";
import { preventiviService } from "@/src/services/preventivi.service";

/** Prefisso stabile per tutte le query atomi dominio mezzo (invalidazione globale). */
export const mezzoDomainQueryKeys = {
  root: ["mezzoQueries"] as const,
  base: (mezzoId: string) => [...mezzoDomainQueryKeys.root, "base", mezzoId] as const,
  preventivi: (mezzoId: string) => [...mezzoDomainQueryKeys.root, "preventivi", mezzoId] as const,
  documenti: (mezzoId: string) => [...mezzoDomainQueryKeys.root, "documenti", mezzoId] as const,
  log: (mezzoId: string) => [...mezzoDomainQueryKeys.root, "log", mezzoId] as const,
  movimenti: (mezzoId: string, lavorazioneIdsKey: string) =>
    [...mezzoDomainQueryKeys.root, "movimenti", mezzoId, lavorazioneIdsKey] as const,
};

const MEZZO_ATOMIC_STALE_MS = 30_000;

function mezzoIdOrEmpty(mezzoId: string | undefined): string {
  return mezzoId?.trim() ?? "";
}

/** Riga mezzo (anagrafica). */
export function useMezzoBase(mezzoId: string | undefined) {
  const id = mezzoIdOrEmpty(mezzoId);
  return useServiceQuery(mezzoDomainQueryKeys.base(id), () => mezziService.getById(id), {
    enabled: id.length > 0,
    staleTime: MEZZO_ATOMIC_STALE_MS,
  });
}

/** Lavorazioni del mezzo: stessa cache di `useLavorazioniList` / `useLavorazioniByMezzo` (`lavorazioniQueries`). */
export function useMezzoLavorazioni(mezzoId: string | undefined) {
  const id = mezzoIdOrEmpty(mezzoId);
  const filters = useMemo((): LavorazioneFilters | undefined => (id ? { mezzo_id: id, includeMezzo: true } : undefined), [id]);
  const fk = stableLavorazioniFiltersKey(filters);
  return useServiceQuery(lavorazioniDomainQueryKeys.list(fk), () => lavorazioniService.getAll(filters!), {
    enabled: id.length > 0,
    staleTime: MEZZO_ATOMIC_STALE_MS,
  });
}

/** Preventivi collegati al mezzo. */
export function useMezzoPreventivi(mezzoId: string | undefined) {
  const id = mezzoIdOrEmpty(mezzoId);
  return useServiceQuery(mezzoDomainQueryKeys.preventivi(id), () => preventiviService.getAll({ mezzo_id: id }), {
    enabled: id.length > 0,
    staleTime: MEZZO_ATOMIC_STALE_MS,
  });
}

/** Documenti collegati al mezzo. */
export function useMezzoDocumenti(mezzoId: string | undefined) {
  const id = mezzoIdOrEmpty(mezzoId);
  return useServiceQuery(mezzoDomainQueryKeys.documenti(id), () => documentiService.getAll({ mezzo_id: id }), {
    enabled: id.length > 0,
    staleTime: MEZZO_ATOMIC_STALE_MS,
  });
}

/** Log modifiche anagrafica (`entita = mezzi`). */
export function useMezzoLog(mezzoId: string | undefined) {
  const id = mezzoIdOrEmpty(mezzoId);
  return useServiceQuery(mezzoDomainQueryKeys.log(id), () => logService.getAll({ entita: "mezzi", entita_id: id, limit: 200 }), {
    enabled: id.length > 0,
    staleTime: MEZZO_ATOMIC_STALE_MS,
  });
}

/**
 * Movimenti ricambi per tutte le lavorazioni del mezzo.
 * Si aggancia alla lista dominio lavorazioni (`lavorazioniQueries`, stessa cache di `useMezzoLavorazioni`).
 */
export function useMezzoMovimenti(mezzoId: string | undefined) {
  const id = mezzoIdOrEmpty(mezzoId);
  const lavQ = useMezzoLavorazioni(mezzoId);
  const lavIds = lavQ.data?.map((r) => r.id) ?? [];
  const idsKey = useMemo(() => [...lavIds].sort().join(","), [lavIds]);
  return useServiceQuery(
    mezzoDomainQueryKeys.movimenti(id, idsKey || "__none__"),
    () => movimentiService.getAll({ lavorazione_ids: [...lavIds] }),
    {
      enabled: id.length > 0 && lavQ.isSuccess && lavIds.length > 0,
      staleTime: MEZZO_ATOMIC_STALE_MS,
    },
  );
}
