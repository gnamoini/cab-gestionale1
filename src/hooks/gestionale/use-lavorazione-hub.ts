"use client";

import { useCallback, useMemo } from "react";
import {
  useDocumentiByLavorazione,
  useLavorazioneBase,
  useLogByLavorazione,
  useMovimentiByLavorazione,
  usePreventiviByLavorazione,
  useSchedeByLavorazione,
} from "@/src/services/domain/lavorazioni-domain.queries";
import { lavorazioniDomainService, type LavorazioneHubData } from "@/src/services/domain/lavorazioni-domain.service";

/**
 * Hub lavorazione: query atomiche in parallelo (`lavorazioniDomainQueryKeys`) e composizione pura
 * tramite `lavorazioniDomainService.composeLavorazioneHub` (nessun IO nel domain service).
 */
export function useLavorazioneHub(lavorazioneId: string | undefined) {
  const id = lavorazioneId?.trim() ?? "";

  const base = useLavorazioneBase(lavorazioneId);
  const schede = useSchedeByLavorazione(lavorazioneId);
  const mov = useMovimentiByLavorazione(lavorazioneId);
  const pv = usePreventiviByLavorazione(lavorazioneId);
  const doc = useDocumentiByLavorazione(lavorazioneId);
  const log = useLogByLavorazione(lavorazioneId);

  const mezzoId = base.data?.mezzo_id?.trim() ?? "";
  const needDocumenti = mezzoId.length > 0;

  const hubReady =
    id.length > 0 &&
    base.isSuccess &&
    schede.isSuccess &&
    mov.isSuccess &&
    pv.isSuccess &&
    log.isSuccess &&
    (!needDocumenti || doc.isSuccess);

  const snapshot = useMemo(
    () => ({
      lavorazioneRow: base.data,
      schedeRows: schede.data ?? [],
      movimentiRows: mov.data ?? [],
      preventiviRows: pv.data ?? [],
      documentiRows: doc.data ?? [],
      logRows: log.data ?? [],
    }),
    [base.data, schede.data, mov.data, pv.data, doc.data, log.data],
  );

  const data = useMemo((): LavorazioneHubData | undefined => {
    if (!hubReady) return undefined;
    return lavorazioniDomainService.composeLavorazioneHub(snapshot) ?? undefined;
  }, [hubReady, snapshot]);

  const isError =
    id.length > 0 &&
    (base.isError ||
      schede.isError ||
      mov.isError ||
      pv.isError ||
      log.isError ||
      (needDocumenti && doc.isError));

  const error = useMemo(() => {
    return (
      base.error ??
      schede.error ??
      mov.error ??
      pv.error ??
      log.error ??
      (needDocumenti ? doc.error : null) ??
      null
    );
  }, [base.error, schede.error, mov.error, pv.error, log.error, doc.error, needDocumenti]);

  const isLoading = id.length > 0 && !isError && !hubReady;

  const refetch = useCallback(() => {
    return Promise.all([base.refetch(), schede.refetch(), mov.refetch(), pv.refetch(), doc.refetch(), log.refetch()]).then(() => undefined);
  }, [base, schede, mov, pv, doc, log]);

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
