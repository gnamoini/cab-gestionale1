import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import type {
  DocumentoRow,
  LogModificaRow,
  LavorazioneRow,
  MovimentoRicambioRow,
  PreventivoRow,
  SchedaLavorazioneRow,
  TipoSchedaLavorazione,
} from "@/src/types/supabase-tables";

export type LavorazioneQueriesSnapshot = {
  lavorazioneRow: LavorazioneRow | null | undefined;
  schedeRows: SchedaLavorazioneRow[];
  movimentiRows: MovimentoRicambioRow[];
  preventiviRows: PreventivoRow[];
  documentiRows: DocumentoRow[];
  logRows: LogModificaRow[];
};

export type LavorazioneHubKpi = {
  stato: string;
  statoLabel: string;
  priorita: string;
  giorniApertura: number | null;
  countSchede: number;
  countMovimenti: number;
  movimentiEntrataCount: number;
  movimentiUscitaCount: number;
  qtyRicambiUscita: number;
  countPreventivi: number;
  countDocumenti: number;
  countLog: number;
};

export type LavorazioneTimelineKind = "lavorazione" | "scheda" | "movimento" | "preventivo" | "documento" | "log";

export type LavorazioneTimelineItem = {
  id: string;
  kind: LavorazioneTimelineKind;
  at: string;
  title: string;
  subtitle?: string;
};

export type LavorazioneHubData = {
  lavorazioneId: string;
  lavorazione: LavorazioneRow;
  schede: SchedaLavorazioneRow[];
  movimenti: MovimentoRicambioRow[];
  preventivi: PreventivoRow[];
  documenti: DocumentoRow[];
  log: LogModificaRow[];
  kpi: LavorazioneHubKpi;
  timeline: LavorazioneTimelineItem[];
};

type LavorazioneHubCore = {
  lavorazione: LavorazioneRow;
  schedeRows: SchedaLavorazioneRow[];
  movimentiRows: MovimentoRicambioRow[];
  preventiviRows: PreventivoRow[];
  documentiRows: DocumentoRow[];
  logRows: LogModificaRow[];
};

function labelTipoScheda(t: TipoSchedaLavorazione): string {
  switch (t) {
    case "ingresso":
      return "Ingresso";
    case "intervento":
      return "Intervento";
    case "ricambi":
      return "Ricambi";
    default:
      return t;
  }
}

function parseDayStart(iso: string): Date | null {
  const s = iso.trim();
  if (!s) return null;
  const d = new Date(s.length <= 10 ? `${s}T12:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function utcTodayStart(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12, 0, 0, 0));
}

/** Giorni tra ingresso e uscita (o oggi se ancora aperta). */
function giorniAperturaLavorazione(row: LavorazioneRow): number | null {
  const start = parseDayStart(row.data_ingresso ?? "");
  if (!start) return null;
  const endRaw = row.data_uscita?.trim();
  const end = endRaw ? parseDayStart(endRaw) : utcTodayStart();
  if (!end) return null;
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diff / (86_400_000)));
}

function toCore(snapshot: LavorazioneQueriesSnapshot): LavorazioneHubCore | null {
  const row = snapshot.lavorazioneRow;
  if (!row) return null;
  return {
    lavorazione: row,
    schedeRows: snapshot.schedeRows,
    movimentiRows: snapshot.movimentiRows,
    preventiviRows: snapshot.preventiviRows,
    documentiRows: snapshot.documentiRows,
    logRows: snapshot.logRows,
  };
}

function deriveKpi(core: LavorazioneHubCore): LavorazioneHubKpi {
  const mov = core.movimentiRows;
  const ent = mov.filter((m) => m.tipo === "entrata");
  const usc = mov.filter((m) => m.tipo === "uscita");
  const qtyUsc = usc.reduce((acc, m) => acc + (Number.isFinite(m.quantita) ? m.quantita : 0), 0);
  return {
    stato: core.lavorazione.stato,
    statoLabel: labelLavorazioneStatoDb(core.lavorazione.stato),
    priorita: core.lavorazione.priorita,
    giorniApertura: giorniAperturaLavorazione(core.lavorazione),
    countSchede: core.schedeRows.length,
    countMovimenti: mov.length,
    movimentiEntrataCount: ent.length,
    movimentiUscitaCount: usc.length,
    qtyRicambiUscita: qtyUsc,
    countPreventivi: core.preventiviRows.length,
    countDocumenti: core.documentiRows.length,
    countLog: core.logRows.length,
  };
}

function buildTimeline(core: LavorazioneHubCore): LavorazioneTimelineItem[] {
  const lav = core.lavorazione;
  const items: LavorazioneTimelineItem[] = [];

  items.push({
    id: `lav-created-${lav.id}`,
    kind: "lavorazione",
    at: lav.created_at,
    title: "Lavorazione creata",
    subtitle: labelLavorazioneStatoDb(lav.stato),
  });

  const di = lav.data_ingresso?.trim();
  if (di) {
    items.push({
      id: `lav-ingresso-${lav.id}`,
      kind: "lavorazione",
      at: di.length <= 10 ? `${di}T08:00:00` : di,
      title: "Data ingresso officina",
    });
  }

  const du = lav.data_uscita?.trim();
  if (du) {
    items.push({
      id: `lav-uscita-${lav.id}`,
      kind: "lavorazione",
      at: du.length <= 10 ? `${du}T18:00:00` : du,
      title: "Data uscita officina",
    });
  }

  if (lav.updated_at !== lav.created_at) {
    items.push({
      id: `lav-updated-${lav.id}`,
      kind: "lavorazione",
      at: lav.updated_at,
      title: "Lavorazione aggiornata",
    });
  }

  for (const s of core.schedeRows) {
    items.push({
      id: `scheda-${s.id}`,
      kind: "scheda",
      at: s.created_at,
      title: `Scheda · ${labelTipoScheda(s.tipo)}`,
    });
  }

  for (const m of core.movimentiRows) {
    items.push({
      id: `mov-${m.id}`,
      kind: "movimento",
      at: m.created_at,
      title: m.tipo === "entrata" ? "Entrata magazzino" : "Uscita magazzino",
      subtitle: `${m.quantita} pz · ricambio ${m.ricambio_id.slice(0, 8)}…`,
    });
  }

  for (const p of core.preventiviRows) {
    items.push({
      id: `pv-${p.id}`,
      kind: "preventivo",
      at: p.created_at,
      title: "Preventivo",
      subtitle: `${p.cliente} · € ${p.totale.toFixed(2)}`,
    });
  }

  for (const d of core.documentiRows) {
    items.push({
      id: `doc-${d.id}`,
      kind: "documento",
      at: d.created_at,
      title: `Documento · ${d.categoria}`,
      subtitle: [d.marca, d.modello].filter(Boolean).join(" ") || undefined,
    });
  }

  for (const lg of core.logRows) {
    items.push({
      id: `log-${lg.id}`,
      kind: "log",
      at: lg.created_at,
      title: `Registro · ${lg.azione}`,
      subtitle: lg.autore_id ? `Utente ${lg.autore_id.slice(0, 8)}…` : undefined,
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

function assembleHub(core: LavorazioneHubCore): LavorazioneHubData {
  return {
    lavorazioneId: core.lavorazione.id,
    lavorazione: core.lavorazione,
    schede: core.schedeRows,
    movimenti: core.movimentiRows,
    preventivi: core.preventiviRows,
    documenti: core.documentiRows,
    log: core.logRows,
    kpi: deriveKpi(core),
    timeline: buildTimeline(core),
  };
}

/** Solo composizione dati già risolti dalla cache (nessun IO). */
export const lavorazioniDomainService = {
  composeLavorazioneHub(snapshot: LavorazioneQueriesSnapshot): LavorazioneHubData | null {
    const core = toCore(snapshot);
    if (!core) return null;
    return assembleHub(core);
  },

  composeKpi(snapshot: LavorazioneQueriesSnapshot): LavorazioneHubKpi | null {
    const core = toCore(snapshot);
    if (!core) return null;
    return deriveKpi(core);
  },

  composeTimeline(snapshot: LavorazioneQueriesSnapshot): LavorazioneTimelineItem[] | null {
    const core = toCore(snapshot);
    if (!core) return null;
    return buildTimeline(core);
  },
};
