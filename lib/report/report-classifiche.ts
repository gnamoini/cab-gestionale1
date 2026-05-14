import { isCompletataForReport } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { interventiMezzoDaLavorazioni } from "@/lib/mezzi/lavorazioni-sync";
import { deltaPct, isoInRange, type DateRange } from "@/lib/report/date-ranges";
import { extractScortaDelta } from "@/lib/report/magazzino-log-parse";

export type ReportRowCompare = {
  prior: number;
  deltaAbs: number;
  deltaPct: number | null;
};

function touchLavorazione(ingressoIso: string, completamentoIso: string | null, r: DateRange): boolean {
  const i = new Date(ingressoIso).getTime();
  if (Number.isNaN(i)) return false;
  const c = completamentoIso ? new Date(completamentoIso).getTime() : Number.POSITIVE_INFINITY;
  return i <= r.end.getTime() && c >= r.start.getTime();
}

export type TopRicambioReportRow = {
  rank: number;
  id: string;
  codice: string;
  nome: string;
  marca: string;
  qtaEntrata: number;
  qtaUscita: number;
  compare?: ReportRowCompare;
};

export type TopMezzoReportRow = {
  rank: number;
  id: string;
  mezzo: string;
  targa: string;
  matricola: string;
  nScuderia: string;
  cliente: string;
  interventi: number;
  compare?: ReportRowCompare;
};

export type TopClienteReportRow = {
  rank: number;
  cliente: string;
  interventi: number;
  ultimoIso: string | null;
  compare?: ReportRowCompare;
};

export function mergeTopRicambiCompare(cur: TopRicambioReportRow[], prev: TopRicambioReportRow[]): TopRicambioReportRow[] {
  const pmap = new Map(prev.map((r) => [r.id, r.qtaUscita]));
  return cur.map((r) => {
    const pv = pmap.get(r.id) ?? 0;
    return {
      ...r,
      compare: { prior: pv, deltaAbs: Math.round((r.qtaUscita - pv) * 100) / 100, deltaPct: deltaPct(r.qtaUscita, pv) },
    };
  });
}

export function mergeTopMezziCompare(cur: TopMezzoReportRow[], prev: TopMezzoReportRow[]): TopMezzoReportRow[] {
  const pmap = new Map(prev.map((r) => [r.id, r.interventi]));
  return cur.map((r) => {
    const pv = pmap.get(r.id) ?? 0;
    return {
      ...r,
      compare: { prior: pv, deltaAbs: r.interventi - pv, deltaPct: deltaPct(r.interventi, pv) },
    };
  });
}

export function mergeTopClientiCompare(cur: TopClienteReportRow[], prev: TopClienteReportRow[]): TopClienteReportRow[] {
  const pmap = new Map(prev.map((r) => [r.cliente, r.interventi]));
  return cur.map((r) => {
    const pv = pmap.get(r.cliente) ?? 0;
    return {
      ...r,
      compare: { prior: pv, deltaAbs: r.interventi - pv, deltaPct: deltaPct(r.interventi, pv) },
    };
  });
}

export function buildTopRicambiPeriodo(
  magLog: MagazzinoChangeLogEntry[],
  prodotti: RicambioMagazzino[],
  range: DateRange,
): TopRicambioReportRow[] {
  const byId = new Map<string, { in: number; out: number }>();
  const bump = (id: string) => {
    if (!byId.has(id)) byId.set(id, { in: 0, out: 0 });
    return byId.get(id)!;
  };

  for (const e of magLog) {
    if (!isoInRange(e.at, range)) continue;
    const row = bump(e.ricambioId);
    const d = extractScortaDelta(e);
    if (e.tipo === "aggiunta") {
      const q = d != null && d > 0 ? d : 1;
      row.in += q;
      continue;
    }
    if (e.tipo === "rimozione") {
      const q = d != null && d < 0 ? -d : 1;
      row.out += q;
      continue;
    }
    if (e.tipo === "update" && d != null) {
      if (d > 0) row.in += d;
      else row.out += -d;
    }
  }

  const prod = new Map(prodotti.map((p) => [p.id, p]));
  const out: Array<Omit<TopRicambioReportRow, "rank">> = [];
  for (const [id, v] of byId) {
    const p = prod.get(id);
    if (!p && v.in === 0 && v.out === 0) continue;
    out.push({
      id,
      codice: p?.codiceFornitoreOriginale ?? "—",
      nome: p?.descrizione ?? "Ricambio",
      marca: p?.marca ?? "—",
      qtaEntrata: Math.round(v.in * 100) / 100,
      qtaUscita: Math.round(v.out * 100) / 100,
    });
  }
  out.sort((a, b) => b.qtaUscita + b.qtaEntrata - (a.qtaUscita + a.qtaEntrata));
  return out.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function buildTopMezziPeriodo(
  mezzi: MezzoGestito[],
  attive: LavorazioneAttiva[],
  storico: LavorazioneArchiviata[],
  range: DateRange,
): TopMezzoReportRow[] {
  const rows: Array<Omit<TopMezzoReportRow, "rank">> = [];
  for (const m of mezzi) {
    const all = interventiMezzoDaLavorazioni(m, attive, storico).filter((x) =>
      touchLavorazione(x.dataIngresso, x.dataCompletamento, range),
    );
    if (all.length === 0) continue;
    rows.push({
      id: m.id,
      mezzo: `${m.marca} ${m.modello}`.trim(),
      targa: m.targa || "—",
      matricola: m.matricola || "—",
      nScuderia: (m.numeroScuderia ?? "").trim() || "—",
      cliente: m.cliente,
      interventi: all.length,
    });
  }
  rows.sort((a, b) => b.interventi - a.interventi);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

type LavRef = {
  id: string;
  cliente: string;
  ingresso: string;
  completamento: string | null;
};

function collectLavorazioniRefs(attive: LavorazioneAttiva[], storico: LavorazioneArchiviata[]): LavRef[] {
  const out: LavRef[] = [];
  for (const x of storico) {
    out.push({
      id: x.id,
      cliente: x.cliente,
      ingresso: x.dataIngresso,
      completamento: x.dataCompletamento,
    });
  }
  for (const x of attive) {
    out.push({
      id: x.id,
      cliente: x.cliente,
      ingresso: x.dataIngresso,
      completamento: isCompletataForReport(x.statoId) ? x.dataCompletamento : null,
    });
  }
  return out;
}

export function buildTopClientiPeriodo(
  attive: LavorazioneAttiva[],
  storico: LavorazioneArchiviata[],
  range: DateRange,
): TopClienteReportRow[] {
  const refs = collectLavorazioniRefs(attive, storico);
  const map = new Map<string, { count: number; lastMs: number }>();

  for (const r of refs) {
    if (!touchLavorazione(r.ingresso, r.completamento, range)) continue;
    const c = r.cliente.trim();
    if (!c) continue;
    const lastIso = r.completamento ?? r.ingresso;
    const lastMs = new Date(lastIso).getTime();
    const cur = map.get(c) ?? { count: 0, lastMs: 0 };
    cur.count += 1;
    if (Number.isFinite(lastMs) && lastMs > cur.lastMs) cur.lastMs = lastMs;
    map.set(c, cur);
  }

  const rows: Array<Omit<TopClienteReportRow, "rank">> = [...map.entries()].map(([cliente, v]) => ({
    cliente,
    interventi: v.count,
    ultimoIso: v.lastMs > 0 ? new Date(v.lastMs).toISOString() : null,
  }));
  rows.sort((a, b) => b.interventi - a.interventi);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
