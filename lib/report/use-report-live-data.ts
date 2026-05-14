"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadMagazzinoChangeLog, MAGAZZINO_CHANGE_LOG_STORAGE_KEY } from "@/lib/magazzino/magazzino-change-log-storage";
import {
  getMagazzinoReportSnapshot,
  subscribeMagazzinoReportSync,
} from "@/lib/magazzino/magazzino-report-sync";
import { splitLavorazioniListRowsForReport } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { getMezziReportSnapshot, subscribeMezziReportSync } from "@/lib/mezzi/mezzi-report-sync";
import { LAVORAZIONI_CHANGE_LOG_STORAGE_KEY, loadLavorazioniChangeLog } from "@/lib/lavorazioni/lavorazioni-change-log";
import { subscribeReportDataRefresh } from "@/lib/report/report-broadcast";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";

const LAV_LIST_FILTERS = { includeMezzo: true as const };

export function useReportLiveData() {
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const lavQuery = useLavorazioniList(LAV_LIST_FILTERS, { staleTime: 30_000 });

  useEffect(() => {
    const u2 = subscribeMagazzinoReportSync(bump);
    const u3 = subscribeMezziReportSync(bump);
    const u4 = subscribeReportDataRefresh(bump);
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === MAGAZZINO_CHANGE_LOG_STORAGE_KEY || e.key === LAVORAZIONI_CHANGE_LOG_STORAGE_KEY) bump();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      u2();
      u3();
      u4();
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [bump]);

  return useMemo(() => {
    const { attive, storico } = splitLavorazioniListRowsForReport(lavQuery.data ?? []);
    return {
      attive,
      storico,
      magazzino: getMagazzinoReportSnapshot(),
      mezzi: getMezziReportSnapshot(),
      magLog: loadMagazzinoChangeLog(),
      lavLog: loadLavorazioniChangeLog(),
      tick,
    };
  }, [tick, lavQuery.data]);
}
