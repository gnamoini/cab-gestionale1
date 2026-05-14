"use client";

import { useMemo } from "react";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { documentiService } from "@/src/services/documenti.service";
import { lavorazioniService, type LavorazioneFilters, type LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { logService } from "@/src/services/log.service";
import { movimentiService } from "@/src/services/movimenti.service";
import { preventiviService } from "@/src/services/preventivi.service";
import { schedeService } from "@/src/services/schede.service";

/** Prefisso stabile per query atomi dominio lavorazioni (invalidazione globale). */
export const lavorazioniDomainQueryKeys = {
  root: ["lavorazioniQueries"] as const,
  base: (lavorazioneId: string) => [...lavorazioniDomainQueryKeys.root, "base", lavorazioneId] as const,
  list: (filtersKey: string) => [...lavorazioniDomainQueryKeys.root, "list", filtersKey] as const,
  schede: (lavorazioneId: string) => [...lavorazioniDomainQueryKeys.root, "schede", lavorazioneId] as const,
  movimenti: (lavorazioneId: string) => [...lavorazioniDomainQueryKeys.root, "movimenti", lavorazioneId] as const,
  preventivi: (lavorazioneId: string) => [...lavorazioniDomainQueryKeys.root, "preventivi", lavorazioneId] as const,
  documenti: (lavorazioneId: string, mezzoId: string) =>
    [...lavorazioniDomainQueryKeys.root, "documenti", lavorazioneId, mezzoId] as const,
  log: (lavorazioneId: string) => [...lavorazioniDomainQueryKeys.root, "log", lavorazioneId] as const,
};

const LA_STALE_MS = 30_000;

function lavIdOrEmpty(lavorazioneId: string | undefined): string {
  return lavorazioneId?.trim() ?? "";
}

export function stableLavorazioniFiltersKey(filters: LavorazioneFilters | undefined): string {
  if (filters == null) return "__all__";
  return JSON.stringify({
    m: filters.mezzo_id ?? "",
    s: filters.stato ?? "",
    p: filters.priorita ?? "",
    i: filters.includeMezzo ? 1 : 0,
    si: [...(filters.stati_in ?? [])].sort().join("|"),
    q: (filters.search ?? "").trim(),
    di0: (filters.data_ingresso_da ?? "").trim(),
    di1: (filters.data_ingresso_a ?? "").trim(),
    du0: (filters.data_uscita_da ?? "").trim(),
    du1: (filters.data_uscita_a ?? "").trim(),
  });
}

type LavListOpts = Omit<
  UseQueryOptions<LavorazioneListRow[], Error, LavorazioneListRow[], ReturnType<typeof lavorazioniDomainQueryKeys.list>>,
  "queryKey" | "queryFn"
>;

/** Lista lavorazioni con filtri opzionali (chiave cache derivata da `stableLavorazioniFiltersKey`). */
export function useLavorazioniList(filters?: LavorazioneFilters, options?: LavListOpts) {
  const fk = stableLavorazioniFiltersKey(filters);
  return useServiceQuery(lavorazioniDomainQueryKeys.list(fk), () => lavorazioniService.getAll(filters), {
    staleTime: LA_STALE_MS,
    enabled: options?.enabled !== false,
    ...options,
  });
}

/** Lavorazioni per mezzo (riusa la stessa chiave di lista con filtri mezzo + join). */
export function useLavorazioniByMezzo(mezzoId: string | undefined) {
  const id = lavIdOrEmpty(mezzoId);
  const filters = useMemo((): LavorazioneFilters | undefined => {
    if (!id) return undefined;
    return { mezzo_id: id, includeMezzo: true };
  }, [id]);
  return useLavorazioniList(filters, { enabled: id.length > 0, staleTime: LA_STALE_MS });
}

/** Singola lavorazione (anagrafica intervento). */
export function useLavorazioneBase(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(lavorazioniDomainQueryKeys.base(id), () => lavorazioniService.getById(id), {
    enabled: id.length > 0,
    staleTime: LA_STALE_MS,
  });
}

/** Schede collegate alla lavorazione. */
export function useSchedeByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(lavorazioniDomainQueryKeys.schede(id), () => schedeService.getAll({ lavorazione_id: id }), {
    enabled: id.length > 0,
    staleTime: LA_STALE_MS,
  });
}

/** Movimenti magazzino per lavorazione. */
export function useMovimentiByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(lavorazioniDomainQueryKeys.movimenti(id), () => movimentiService.getAll({ lavorazione_id: id }), {
    enabled: id.length > 0,
    staleTime: LA_STALE_MS,
  });
}

/** Preventivi collegati alla lavorazione. */
export function usePreventiviByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(lavorazioniDomainQueryKeys.preventivi(id), () => preventiviService.getAll({ lavorazione_id: id }), {
    enabled: id.length > 0,
    staleTime: LA_STALE_MS,
  });
}

/**
 * Documenti del mezzo associato alla lavorazione (il modello `documenti` non ha `lavorazione_id`).
 * Si aggancia a `useLavorazioneBase` per ottenere `mezzo_id`.
 */
export function useDocumentiByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  const base = useLavorazioneBase(lavorazioneId);
  const mezzoId = base.data?.mezzo_id?.trim() ?? "";
  return useServiceQuery(lavorazioniDomainQueryKeys.documenti(id, mezzoId || "__pending__"), () => documentiService.getAll({ mezzo_id: mezzoId }), {
    enabled: id.length > 0 && base.isSuccess && mezzoId.length > 0,
    staleTime: LA_STALE_MS,
  });
}

/** Log modifiche entità `lavorazioni`. */
export function useLogByLavorazione(lavorazioneId: string | undefined) {
  const id = lavIdOrEmpty(lavorazioneId);
  return useServiceQuery(lavorazioniDomainQueryKeys.log(id), () => logService.getAll({ entita: "lavorazioni", entita_id: id, limit: 200 }), {
    enabled: id.length > 0,
    staleTime: LA_STALE_MS,
  });
}
