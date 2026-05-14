"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildLavorazioniGestionaleLogViewModel,
  buildMagazzinoGestionaleLogViewModel,
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogScrollEmbeddedClass,
  logEntryDismissBtnClass,
} from "@/components/gestionale/gestionale-log-ui";
import { loadLavorazioniChangeLog, removeLavorazioniChangeLogEntryById, type LavorazioniLogEntry } from "@/lib/lavorazioni/lavorazioni-change-log";
import {
  loadMagazzinoChangeLog,
  MAGAZZINO_CHANGE_LOG_STORAGE_KEY,
  removeMagazzinoChangeLogEntryById,
  type MagazzinoChangeLogEntry,
} from "@/lib/magazzino/magazzino-change-log-storage";
import { buildLavorazioniLogFocusHref, buildMagazzinoLogFocusHref } from "@/lib/navigation/dashboard-log-links";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { dsSurfaceCard, dsTypoCardTitle } from "@/lib/ui/design-system";

const LAVORAZIONI_LOG_STORAGE_KEY = "gestionale-lavorazioni-change-log-v1";

function sortByAtDesc<T extends { at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ta = Date.parse(a.at);
    const tb = Date.parse(b.at);
    if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta;
    return String(b.at).localeCompare(String(a.at));
  });
}

export function DashboardRecentFeeds() {
  const router = useRouter();
  const staging = isStagingPublicSlice();
  const [lav, setLav] = useState<LavorazioniLogEntry[]>([]);
  const [mag, setMag] = useState<MagazzinoChangeLogEntry[]>([]);

  const refresh = useCallback(() => {
    setLav(loadLavorazioniChangeLog());
    setMag(loadMagazzinoChangeLog());
  }, []);

  useEffect(() => {
    if (staging) return;
    refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === LAVORAZIONI_LOG_STORAGE_KEY || e.key === MAGAZZINO_CHANGE_LOG_STORAGE_KEY) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("storage", onStorage);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh, staging]);

  const lavSlice = useMemo(() => sortByAtDesc(lav).slice(0, 8), [lav]);
  const magSlice = useMemo(() => sortByAtDesc(mag).slice(0, 8), [mag]);

  if (staging) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={`flex min-h-[280px] flex-col ${dsSurfaceCard} p-4 sm:p-5`}>
        <h2 className={dsTypoCardTitle}>Ultime modifiche lavorazioni</h2>
        <div className={`${gestionaleLogScrollEmbeddedClass} mt-3 max-h-[min(360px,52vh)] min-h-0 flex-1 pr-1`}>
          {lavSlice.length === 0 ? (
            <GestionaleLogEmpty message="Nessuna modifica registrata. Apri Lavorazioni per iniziare." />
          ) : (
            <GestionaleLogList>
              {lavSlice.map((entry) => (
                <li key={entry.id} className="list-none">
                  <GestionaleLogEntryFourLines
                    vm={buildLavorazioniGestionaleLogViewModel(entry)}
                    onClick={() => router.push(buildLavorazioniLogFocusHref(entry))}
                    title="Apri in Lavorazioni"
                    trailing={
                      <button
                        type="button"
                        className={logEntryDismissBtnClass}
                        aria-label="Rimuovi voce dal log"
                        title="Rimuovi voce dal log"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Rimuovere questa voce dal log?")) {
                            removeLavorazioniChangeLogEntryById(entry.id);
                            refresh();
                          }
                        }}
                      >
                        ×
                      </button>
                    }
                  />
                </li>
              ))}
            </GestionaleLogList>
          )}
        </div>
      </section>

      <section className={`flex min-h-[280px] flex-col ${dsSurfaceCard} p-4 sm:p-5`}>
        <h2 className={dsTypoCardTitle}>Ultime modifiche ricambi</h2>
        <div className={`${gestionaleLogScrollEmbeddedClass} mt-3 max-h-[min(360px,52vh)] min-h-0 flex-1 pr-1`}>
          {magSlice.length === 0 ? (
            <GestionaleLogEmpty message="Nessuna modifica registrata. Apri Magazzino per aggiornare le giacenze." />
          ) : (
            <GestionaleLogList>
              {magSlice.map((entry) => (
                <li key={entry.id} className="list-none">
                  <GestionaleLogEntryFourLines
                    vm={buildMagazzinoGestionaleLogViewModel(entry)}
                    onClick={() => router.push(buildMagazzinoLogFocusHref(entry))}
                    title="Apri in Magazzino"
                    trailing={
                      <button
                        type="button"
                        className={logEntryDismissBtnClass}
                        aria-label="Rimuovi voce dal log"
                        title="Rimuovi voce dal log"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Rimuovere questa voce dal log?")) {
                            removeMagazzinoChangeLogEntryById(entry.id);
                            refresh();
                          }
                        }}
                      >
                        ×
                      </button>
                    }
                  />
                </li>
              ))}
            </GestionaleLogList>
          )}
        </div>
      </section>
    </div>
  );
}
