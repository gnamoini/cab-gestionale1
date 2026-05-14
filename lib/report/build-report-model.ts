import { isCompletataForReport } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  compareRangeFor,
  deltaPct,
  endOfLocalDay,
  isoInRange,
  resolvePresetRange,
  startOfLocalDay,
  type DateRange,
  type ReportCompareMode,
  type ReportPeriodPreset,
} from "@/lib/report/date-ranges";
import { extractScortaDelta } from "@/lib/report/magazzino-log-parse";
import { buildMagazzinoMonthlyRows } from "@/lib/report/magazzino-monthly-rows";
import { loadMagazzinoManualMonthMap } from "@/lib/report/magazzino-manual-storage";

export type ReportLiveInput = {
  anchor: Date;
  preset: ReportPeriodPreset;
  customFrom?: string;
  customTo?: string;
  compareMode?: ReportCompareMode;
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  magazzino: RicambioMagazzino[];
  mezzi: MezzoGestito[];
  magLog: MagazzinoChangeLogEntry[];
};

export type KpiCompareRow = {
  label: string;
  deltaAbs: string | null;
  deltaPct: number | null;
  /** Valore più basso = migliore (es. giorni chiusura). */
  invert?: boolean;
};

export type KpiCardModel = {
  id: string;
  label: string;
  value: string;
  sub?: string;
  /** Righe confronto periodo; null se confronto disattivato. */
  compareRows: KpiCompareRow[] | null;
  spark: number[];
};

export type ReportCompareDetail = {
  openedCur: number;
  openedPrev: number;
  completedCur: number;
  completedPrev: number;
  magDeltaCapCur: number;
  magDeltaCapPrev: number;
};

export type ReportModel = {
  range: DateRange;
  compareRange: DateRange | null;
  compareMode: ReportCompareMode;
  kpis: KpiCardModel[];
  /** Dettaglio numerico per banner nelle sezioni (evita logica duplicata). */
  compareDetail: ReportCompareDetail | null;
};

function countOpenedInRange(attive: LavorazioneAttiva[], storico: LavorazioneArchiviata[], r: DateRange): number {
  let n = 0;
  for (const x of attive) if (isoInRange(x.dataIngresso, r)) n += 1;
  for (const x of storico) if (isoInRange(x.dataIngresso, r)) n += 1;
  return n;
}

function countCompletedInRange(attive: LavorazioneAttiva[], storico: LavorazioneArchiviata[], r: DateRange): number {
  let n = 0;
  for (const x of storico) {
    if (x.dataCompletamento && isoInRange(x.dataCompletamento, r)) n += 1;
  }
  for (const x of attive) {
    if (isCompletataForReport(x.statoId) && x.dataCompletamento && isoInRange(x.dataCompletamento, r)) {
      n += 1;
    }
  }
  return n;
}

function avgCloseDays(storico: LavorazioneArchiviata[], attive: LavorazioneAttiva[], r: DateRange): number {
  const vals: number[] = [];
  const ms = (a: string, b: string) => {
    const t0 = new Date(a).getTime();
    const t1 = new Date(b).getTime();
    if (Number.isNaN(t0) || Number.isNaN(t1)) return 0;
    return Math.max(0, (t1 - t0) / 86400000);
  };
  for (const x of storico) {
    if (!x.dataCompletamento || !isoInRange(x.dataCompletamento, r)) continue;
    const g = ms(x.dataIngresso, x.dataCompletamento);
    if (g > 0) vals.push(g);
  }
  for (const x of attive) {
    if (!isCompletataForReport(x.statoId) || !x.dataCompletamento) continue;
    if (!isoInRange(x.dataCompletamento, r)) continue;
    const g = ms(x.dataIngresso, x.dataCompletamento);
    if (g > 0) vals.push(g);
  }
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}

function uniqueClientiServiti(attive: LavorazioneAttiva[], storico: LavorazioneArchiviata[], r: DateRange): number {
  const s = new Set<string>();
  const touch = (c: string, inR: boolean) => {
    const t = c.trim();
    if (!t || !inR) return;
    s.add(t);
  };
  for (const x of attive) {
    const inR =
      isoInRange(x.dataIngresso, r) || (x.dataCompletamento ? isoInRange(x.dataCompletamento, r) : false);
    touch(x.cliente, inR);
  }
  for (const x of storico) {
    const inR =
      (x.dataCompletamento && isoInRange(x.dataCompletamento, r)) || isoInRange(x.dataIngresso, r);
    touch(x.cliente, inR);
  }
  return s.size;
}

function ricambiUtilizzatiQty(magLog: MagazzinoChangeLogEntry[], r: DateRange): number {
  let q = 0;
  for (const e of magLog) {
    if (!isoInRange(e.at, r)) continue;
    const d = extractScortaDelta(e);
    if (d != null && d < 0) q += -d;
  }
  return Math.round(q * 10) / 10;
}

function totalCapitale(rows: RicambioMagazzino[]): number {
  let s = 0;
  for (const r of rows) s += capitaleImmobilizzato(r);
  return Math.round(s * 100) / 100;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0, 0);
}

function sparkFromDailyCompletions(storico: LavorazioneArchiviata[], attive: LavorazioneAttiva[], end: Date): number[] {
  const days = 7;
  const out = Array.from({ length: days }, () => 0);
  for (let i = 0; i < days; i++) {
    const dayStart = startOfLocalDay(addDays(end, -(days - 1 - i)));
    const dayEnd = endOfLocalDay(dayStart);
    const r: DateRange = { start: dayStart, end: dayEnd };
    out[i] = countCompletedInRange(attive, storico, r);
  }
  return out;
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function sumMagazzinoPeriod(
  magLog: MagazzinoChangeLogEntry[],
  prodotti: RicambioMagazzino[],
  r: DateRange,
  anchor: Date,
): { deltaCapitale: number; entrate: number; uscite: number } {
  const manual = loadMagazzinoManualMonthMap();
  const { rows } = buildMagazzinoMonthlyRows(magLog, prodotti, r, anchor, manual);
  return rows.reduce(
    (acc, row) => ({
      deltaCapitale: acc.deltaCapitale + row.deltaCapitale,
      entrate: acc.entrate + row.entrate,
      uscite: acc.uscite + row.uscite,
    }),
    { deltaCapitale: 0, entrate: 0, uscite: 0 },
  );
}

function fmtSignedInt(n: number): string {
  const s = n > 0 ? "+" : "";
  return `${s}${n}`;
}

function fmtSignedEur(n: number): string {
  const s = n > 0 ? "+" : "";
  return `${s}${n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`;
}

export function buildReportModel(input: ReportLiveInput): ReportModel {
  const compareMode = input.compareMode ?? "none";
  const range = resolvePresetRange(input.anchor, input.preset, input.customFrom, input.customTo);
  const compareRange = compareMode === "none" ? null : compareRangeFor(range, compareMode);
  const { attive, storico, magazzino, mezzi, magLog, anchor } = input;

  const opened = countOpenedInRange(attive, storico, range);
  const completed = countCompletedInRange(attive, storico, range);
  const tempoMedio = avgCloseDays(storico, attive, range);
  const cap = totalCapitale(magazzino);
  const ricambi = ricambiUtilizzatiQty(magLog, range);
  const clienti = uniqueClientiServiti(attive, storico, range);
  const mezziN = mezzi.length;

  const magCur = sumMagazzinoPeriod(magLog, magazzino, range, anchor);
  const magPrev = compareRange ? sumMagazzinoPeriod(magLog, magazzino, compareRange, anchor) : null;

  const openedP = compareRange ? countOpenedInRange(attive, storico, compareRange) : null;
  const completedP = compareRange ? countCompletedInRange(attive, storico, compareRange) : null;
  const tempoP = compareRange ? avgCloseDays(storico, attive, compareRange) : null;
  const ricambiP = compareRange ? ricambiUtilizzatiQty(magLog, compareRange) : null;
  const clientiP = compareRange ? uniqueClientiServiti(attive, storico, compareRange) : null;

  const spark = sparkFromDailyCompletions(storico, attive, range.end);

  const dOpened =
    compareRange && openedP != null
      ? { abs: fmtSignedInt(opened - openedP), pct: deltaPct(opened, openedP) }
      : { abs: null, pct: null as number | null };
  const dCompleted =
    compareRange && completedP != null
      ? { abs: fmtSignedInt(completed - completedP), pct: deltaPct(completed, completedP) }
      : { abs: null, pct: null };
  const dTempo =
    compareRange && tempoP != null
      ? {
          abs: `${tempoMedio - tempoP >= 0 ? "+" : ""}${Math.round((tempoMedio - tempoP) * 10) / 10} gg`,
          pct: deltaPct(tempoMedio, tempoP),
        }
      : { abs: null, pct: null };
  const dRicambi =
    compareRange && ricambiP != null
      ? { abs: `${ricambi - ricambiP > 0 ? "+" : ""}${Math.round((ricambi - ricambiP) * 10) / 10}`, pct: deltaPct(ricambi, ricambiP) }
      : { abs: null, pct: null };
  const dClienti =
    compareRange && clientiP != null
      ? { abs: fmtSignedInt(clienti - clientiP), pct: deltaPct(clienti, clientiP) }
      : { abs: null, pct: null };
  const dDeltaCap =
    magPrev != null
      ? {
          abs: fmtSignedEur(magCur.deltaCapitale - magPrev.deltaCapitale),
          pct: deltaPct(magCur.deltaCapitale, magPrev.deltaCapitale),
        }
      : { abs: null, pct: null };

  const pctChiusSuIngressi = opened > 0 ? Math.round((completed / opened) * 1000) / 10 : null;
  const lavSubParts = [
    `Chiuse ${completed}${pctChiusSuIngressi != null ? ` (${pctChiusSuIngressi}% degli ingressi)` : ""}`,
    tempoMedio > 0 ? `Tempo medio chiusura ${tempoMedio} gg` : "Tempo medio chiusura —",
  ];
  const lavCompareRows: KpiCompareRow[] | null = compareRange
    ? [
        { label: "Ingressi", deltaAbs: dOpened.abs, deltaPct: dOpened.pct },
        { label: "Chiuse", deltaAbs: dCompleted.abs, deltaPct: dCompleted.pct },
        { label: "Tempo medio", deltaAbs: dTempo.abs, deltaPct: dTempo.pct, invert: true },
      ]
    : null;

  const kpis: KpiCardModel[] = [
    {
      id: "lav-periodo",
      label: "Lavorazioni periodo",
      value: String(opened),
      sub: `Ingressi registrati nel filtro · ${lavSubParts.join(" · ")}`,
      compareRows: lavCompareRows,
      spark,
    },
    {
      id: "cap",
      label: "Capitale immobilizzato",
      value: fmtEur(cap),
      sub: "Snapshot magazzino · il confronto è sulla somma dei Δ capitale nel periodo",
      compareRows:
        compareRange != null
          ? [{ label: "Σ Δ capitale nel periodo", deltaAbs: dDeltaCap.abs, deltaPct: dDeltaCap.pct }]
          : null,
      spark,
    },
    {
      id: "ric-usati",
      label: "Ricambi movimentati",
      value: String(ricambi),
      sub: "Somma uscite (Δ scorta) nel periodo dai log",
      compareRows:
        compareRange != null
          ? [{ label: "Uscite nel periodo", deltaAbs: dRicambi.abs, deltaPct: dRicambi.pct }]
          : null,
      spark,
    },
    {
      id: "clienti",
      label: "Clienti attivi",
      value: String(clienti),
      sub: "Clienti con almeno un contatto nel periodo (ingresso o chiusura)",
      compareRows:
        compareRange != null
          ? [{ label: "Clienti nel periodo", deltaAbs: dClienti.abs, deltaPct: dClienti.pct }]
          : null,
      spark,
    },
    {
      id: "mezzi",
      label: "Mezzi in anagrafica",
      value: String(mezziN),
      sub: "Totale flotta (non legato al periodo)",
      compareRows: null,
      spark,
    },
  ];

  const compareDetail = compareRange
    ? {
        openedCur: opened,
        openedPrev: openedP!,
        completedCur: completed,
        completedPrev: completedP!,
        magDeltaCapCur: magCur.deltaCapitale,
        magDeltaCapPrev: magPrev!.deltaCapitale,
      }
    : null;

  return { range, compareRange, compareMode, kpis, compareDetail };
}
