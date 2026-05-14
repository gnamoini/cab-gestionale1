"use client";

import { useCallback, useMemo } from "react";
import {
  useMezzoBase,
  useMezzoDocumenti,
  useMezzoLavorazioni,
  useMezzoLog,
  useMezzoMovimenti,
  useMezzoPreventivi,
} from "@/src/services/domain/mezzo-domain.queries";
import { mezzoDomainService, type MezzoHubData } from "@/src/services/domain/mezzo-domain.service";

/**
 * Hub mezzo: attiva in parallelo le query atomiche (`mezzoDomainQueryKeys`) e compone il payload
 * tramite `mezzoDomainService.composeHubData` (nessun IO nel domain service).
 * Le lavorazioni del mezzo condividono la cache `lavorazioniQueries` con `useLavorazioniList`.
 */
export function useMezzoHub(mezzoId: string | undefined) {
  const id = mezzoId?.trim() ?? "";

  const base = useMezzoBase(mezzoId);
  /** Nota: `useMezzoMovimenti` richiama internamente la stessa query; React Query deduplica il network. */
  const lav = useMezzoLavorazioni(mezzoId);
  const pv = useMezzoPreventivi(mezzoId);
  const doc = useMezzoDocumenti(mezzoId);
  const log = useMezzoLog(mezzoId);
  const mov = useMezzoMovimenti(mezzoId);

  const lavIds = lav.data?.map((r) => r.id) ?? [];

  const hubReady =
    id.length > 0 &&
    base.isSuccess &&
    lav.isSuccess &&
    pv.isSuccess &&
    doc.isSuccess &&
    log.isSuccess &&
    (lavIds.length === 0 || mov.isSuccess);

  const snapshot = useMemo(
    () => ({
      mezzoRow: base.data,
      lavorazioni: lav.data ?? [],
      preventiviRows: pv.data ?? [],
      documentiRows: doc.data ?? [],
      logRows: log.data ?? [],
      movimentiRows: mov.data ?? [],
    }),
    [base.data, lav.data, pv.data, doc.data, log.data, mov.data],
  );

  const data = useMemo((): MezzoHubData | undefined => {
    if (!hubReady) return undefined;
    return mezzoDomainService.composeHubData(snapshot) ?? undefined;
  }, [hubReady, snapshot]);

  const isError =
    id.length > 0 &&
    (base.isError || lav.isError || pv.isError || doc.isError || log.isError || (lavIds.length > 0 && mov.isError));

  const error = useMemo(() => {
    const e = base.error ?? lav.error ?? pv.error ?? doc.error ?? log.error ?? (lavIds.length > 0 ? mov.error : null);
    return e ?? null;
  }, [base.error, lav.error, pv.error, doc.error, log.error, mov.error, lavIds.length]);

  const isLoading = id.length > 0 && !isError && !hubReady;

  const refetch = useCallback(() => {
    return Promise.all([base.refetch(), lav.refetch(), pv.refetch(), doc.refetch(), log.refetch(), mov.refetch()]).then(() => undefined);
  }, [base, lav, pv, doc, log, mov]);

  return {
    data,
    isLoading,
    isError,
    error,
    isSuccess: hubReady && Boolean(data),
    refetch,
    status: isError ? ("error" as const) : isLoading ? ("pending" as const) : hubReady ? ("success" as const) : ("pending" as const),
  };
}
