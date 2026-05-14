"use client";

import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogScrollEmbeddedClass,
  logEntryDismissBtnClass,
} from "@/components/gestionale/gestionale-log-ui";
import {
  DASHBOARD_SISTEMA_LOG_STORAGE_KEY,
  loadDashboardSistemaLog,
  removeDashboardSistemaLogEntryById,
  type DashboardSistemaLogStored,
} from "@/lib/dashboard/dashboard-sistema-log-storage";
import { CAB_DASHBOARD_SISTEMA_LOG_REFRESH } from "@/lib/sistema/cab-events";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";

function vmFromStored(e: DashboardSistemaLogStored) {
  const { id: _id, ...vm } = e;
  return vm;
}

const GROUP_WINDOW_MS = 120_000;

/** Raggruppa modifiche ravvicinate sullo stesso oggetto (stesso tipo + titolo oggetto). */
function groupDashboardSistemaEntries(entries: DashboardSistemaLogStored[]): DashboardSistemaLogStored[] {
  if (entries.length === 0) return [];
  const out: DashboardSistemaLogStored[] = [];
  let buf: DashboardSistemaLogStored[] = [];

  function flush() {
    if (buf.length === 0) return;
    if (buf.length === 1) {
      out.push(buf[0]);
    } else {
      const first = buf[0];
      const last = buf[buf.length - 1];
      const base = first.modificaRiga.replace(/\s*\(\d+\s+cambi\)\s*$/i, "").trim();
      out.push({
        ...last,
        id: `grp-${first.id}-${buf.length}-${last.atIso}`,
        modificaRiga: `${base} (${buf.length} cambi)`,
      });
    }
    buf = [];
  }

  for (const e of entries) {
    const prev = buf[buf.length - 1];
    if (
      prev &&
      prev.tipoRiga === e.tipoRiga &&
      prev.oggettoRiga === e.oggettoRiga &&
      Math.abs(new Date(e.atIso).getTime() - new Date(prev.atIso).getTime()) <= GROUP_WINDOW_MS
    ) {
      buf.push(e);
    } else {
      flush();
      buf = [e];
    }
  }
  flush();
  return out;
}

function useDashboardSistemaLogEntries(): DashboardSistemaLogStored[] {
  const [entries, setEntries] = useState<DashboardSistemaLogStored[]>([]);

  useEffect(() => {
    function refresh() {
      setEntries(loadDashboardSistemaLog());
    }
    refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === DASHBOARD_SISTEMA_LOG_STORAGE_KEY) refresh();
    };
    window.addEventListener(CAB_DASHBOARD_SISTEMA_LOG_REFRESH, refresh);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CAB_DASHBOARD_SISTEMA_LOG_REFRESH, refresh);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return entries;
}

export function DashboardSistemaLogListEmbedded({
  max = 40,
  className,
  dismissible,
  paged = false,
}: {
  max?: number;
  className?: string;
  /** Se true: nessun raggruppamento, con pulsante rimozione voce (solo log locale). */
  dismissible?: boolean;
  /** Elenco completo con paginazione (25/50/100); ignora `max`. */
  paged?: boolean;
}) {
  const entries = useDashboardSistemaLogEntries();
  const grouped = useMemo(() => (dismissible ? entries : groupDashboardSistemaEntries(entries)), [entries, dismissible]);

  const pageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(grouped.length, pageSize);

  useEffect(() => {
    if (!paged) return;
    resetPage();
  }, [paged, grouped.length, pageSize, resetPage]);

  const slice = useMemo(() => {
    if (paged) return sliceItems(grouped);
    return grouped.slice(0, max);
  }, [paged, grouped, max, sliceItems, page]);

  const list = (
    <>
      {slice.length === 0 ? (
        <GestionaleLogEmpty message="Nessuna attività registrata. Le modifiche da Impostazioni e dalle attività compaiono qui." />
      ) : (
        <GestionaleLogList>
          {slice.map((e) => (
            <li key={e.id} className="list-none">
              <GestionaleLogEntryFourLines
                vm={vmFromStored(e)}
                trailing={
                  dismissible ? (
                    <button
                      type="button"
                      className={logEntryDismissBtnClass}
                      aria-label="Rimuovi voce dal log"
                      title="Rimuovi voce dal log"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (window.confirm("Rimuovere questa voce dal log?")) removeDashboardSistemaLogEntryById(e.id);
                      }}
                    >
                      ×
                    </button>
                  ) : undefined
                }
              />
            </li>
          ))}
        </GestionaleLogList>
      )}
    </>
  );

  if (paged) {
    return (
      <div className={`flex min-h-0 flex-1 flex-col gap-2 ${className ?? ""}`}>
        <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 flex-1 pr-1`}>{list}</div>
        {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
      </div>
    );
  }

  return <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 flex-1 pr-1 ${className ?? ""}`}>{list}</div>;
}
