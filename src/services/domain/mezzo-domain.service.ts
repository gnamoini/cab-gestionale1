import {
  documentoRowToGestionale,
  logModificaRowToMezziHubLogEntry,
  preventivoRowToRecordStub,
  toMezzoUI,
  type MezziHubLogEntry,
} from "@/lib/mezzi/mezzi-db-ui-adapter";
import {
  interventiMezzoDaLavorazioniDb,
  isLavorazioneStoricoDb,
  labelLavorazioneStatoDb,
  mezzoHaLavorazioneAttivaDb,
} from "@/lib/mezzi/interventi-from-lavorazioni-db";
import type { MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { DocumentoRow, LogModificaRow, MezzoRow, MovimentoRicambioRow, PreventivoRow } from "@/src/types/supabase-tables";

export type MezzoHubKpi = {
  totaleLavorazioni: number;
  lavorazioneAttiva: boolean;
  documentiCount: number;
  preventiviCount: number;
};

export type MezzoTimelineKind = "lavorazione" | "log" | "movimento";

export type MezzoTimelineItem = {
  id: string;
  kind: MezzoTimelineKind;
  at: string;
  title: string;
  subtitle?: string;
  ref?: { lavorazioneId?: string; origine?: "attiva" | "storico" };
};

export type MezzoHubData = {
  mezzoId: string;
  mezzoRow: MezzoRow;
  lavorazioni: LavorazioneListRow[];
  interventi: MezzoInterventoLavorazione[];
  preventivi: PreventivoRecord[];
  documenti: DocumentoGestionale[];
  log: MezziHubLogEntry[];
  movimenti: MovimentoRicambioRow[];
  kpi: MezzoHubKpi;
  timeline: MezzoTimelineItem[];
};

/** Snapshot read-only da sole query React Query (nessun IO). */
export type MezzoQueriesSnapshot = {
  mezzoRow: MezzoRow | null | undefined;
  lavorazioni: LavorazioneListRow[];
  preventiviRows: PreventivoRow[];
  documentiRows: DocumentoRow[];
  logRows: LogModificaRow[];
  movimentiRows: MovimentoRicambioRow[];
};

type MezzoHubCore = {
  mezzoRow: MezzoRow;
  lavorazioni: LavorazioneListRow[];
  preventiviRows: PreventivoRow[];
  documentiRows: DocumentoRow[];
  logRows: LogModificaRow[];
  movimentiRows: MovimentoRicambioRow[];
};

function toCore(snapshot: MezzoQueriesSnapshot): MezzoHubCore | null {
  if (!snapshot.mezzoRow) return null;
  return {
    mezzoRow: snapshot.mezzoRow,
    lavorazioni: snapshot.lavorazioni,
    preventiviRows: snapshot.preventiviRows,
    documentiRows: snapshot.documentiRows,
    logRows: snapshot.logRows,
    movimentiRows: snapshot.movimentiRows,
  };
}

function deriveKpi(core: MezzoHubCore): MezzoHubKpi {
  const mezzoG = toMezzoUI(core.mezzoRow);
  return {
    totaleLavorazioni: core.lavorazioni.length,
    lavorazioneAttiva: mezzoHaLavorazioneAttivaDb(mezzoG, core.lavorazioni),
    documentiCount: core.documentiRows.length,
    preventiviCount: core.preventiviRows.length,
  };
}

function buildTimeline(core: MezzoHubCore): MezzoTimelineItem[] {
  const items: MezzoTimelineItem[] = [];

  for (const lav of core.lavorazioni) {
    const at = lav.data_ingresso?.trim() ? lav.data_ingresso : lav.created_at;
    items.push({
      id: `lav-${lav.id}`,
      kind: "lavorazione",
      at,
      title: `Lavorazione · ${labelLavorazioneStatoDb(lav.stato)}`,
      subtitle: (lav.note ?? "").trim() || undefined,
      ref: {
        lavorazioneId: lav.id,
        origine: isLavorazioneStoricoDb(lav.stato) ? "storico" : "attiva",
      },
    });
  }

  for (const log of core.logRows) {
    items.push({
      id: `log-${log.id}`,
      kind: "log",
      at: log.created_at,
      title: `Anagrafica · ${log.azione}`,
      subtitle: log.autore_id ? `Utente ${log.autore_id.slice(0, 8)}…` : undefined,
    });
  }

  for (const mov of core.movimentiRows) {
    if (!mov.lavorazione_id) continue;
    items.push({
      id: `mov-${mov.id}`,
      kind: "movimento",
      at: mov.created_at,
      title: `${mov.tipo === "entrata" ? "Entrata magazzino" : "Uscita magazzino"} · ${mov.quantita} pz`,
      subtitle: `Ricambio ${mov.ricambio_id.slice(0, 8)}…`,
      ref: { lavorazioneId: mov.lavorazione_id, origine: "attiva" },
    });
  }

  items.sort((a, b) => {
    const tb = new Date(b.at).getTime();
    const ta = new Date(a.at).getTime();
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
  return items;
}

function assembleHubData(core: MezzoHubCore): MezzoHubData {
  const mezzoG = toMezzoUI(core.mezzoRow);
  return {
    mezzoId: core.mezzoRow.id,
    mezzoRow: core.mezzoRow,
    lavorazioni: core.lavorazioni,
    interventi: interventiMezzoDaLavorazioniDb(mezzoG, core.lavorazioni),
    preventivi: core.preventiviRows.map((r) => preventivoRowToRecordStub(r, core.mezzoRow)),
    documenti: core.documentiRows.map(documentoRowToGestionale),
    log: core.logRows.map(logModificaRowToMezziHubLogEntry),
    movimenti: core.movimentiRows,
    kpi: deriveKpi(core),
    timeline: buildTimeline(core),
  };
}

/** Solo composizione dati già risolti dalla cache (nessun fetch). */
export const mezzoDomainService = {
  composeHubData(snapshot: MezzoQueriesSnapshot): MezzoHubData | null {
    const core = toCore(snapshot);
    if (!core) return null;
    return assembleHubData(core);
  },

  composeKpi(snapshot: MezzoQueriesSnapshot): MezzoHubKpi | null {
    const core = toCore(snapshot);
    if (!core) return null;
    return deriveKpi(core);
  },

  composeTimeline(snapshot: MezzoQueriesSnapshot): MezzoTimelineItem[] | null {
    const core = toCore(snapshot);
    if (!core) return null;
    return buildTimeline(core);
  },
};
