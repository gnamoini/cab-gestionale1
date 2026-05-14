import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { DateRange } from "@/lib/report/date-ranges";
import { endOfLocalDay, isoInRange, startOfLocalDay } from "@/lib/report/date-ranges";
import { extractScortaDelta, monthKeyFromIso } from "@/lib/report/magazzino-log-parse";

/** Quantità uscita attribuibile a una riga di log (scarichi da scorta). */
export function usciteQtyFromMagazzinoEntry(e: MagazzinoChangeLogEntry): number {
  const d = extractScortaDelta(e);
  if (e.tipo === "rimozione") {
    return d != null && d < 0 ? -d : 1;
  }
  if (e.tipo === "update" && d != null && d < 0) {
    return -d;
  }
  return 0;
}

export type RicambioConsumoDaLog = {
  totalUscite: number;
  /** Mesi (YYYY-MM) con almeno uno scarico. */
  exitMonthKeys: string[];
  monthsObserved: number;
  lastExitMonthKey: string | null;
  /** `null` se non ci sono uscite nel periodo analizzato. */
  avgMonthly: number | null;
  insufficientReason: string | null;
};

/** Denominatore: mesi (YYYY-MM) con almeno uno scarico nel periodo analizzato. */
function finalizeAgg(totalUscite: number, exitMonths: Set<string>): RicambioConsumoDaLog {
  if (totalUscite <= 0 || exitMonths.size === 0) {
    return {
      totalUscite: 0,
      exitMonthKeys: [],
      monthsObserved: 0,
      lastExitMonthKey: null,
      avgMonthly: null,
      insufficientReason: "Nessuno scarico registrato nel log magazzino per questo periodo.",
    };
  }
  const keys = [...exitMonths].sort((a, b) => a.localeCompare(b));
  const monthsObserved = Math.max(1, exitMonths.size);
  const avgMonthly = totalUscite / monthsObserved;
  return {
    totalUscite,
    exitMonthKeys: keys,
    monthsObserved,
    lastExitMonthKey: keys[keys.length - 1] ?? null,
    avgMonthly,
    insufficientReason: null,
  };
}

/** Aggrega scarichi per ricambio filtrando le righe di log nel range temporale (inclusivo). */
export function computeConsumoDaLogPerRicambio(
  magLog: MagazzinoChangeLogEntry[],
  ricambioId: string,
  range: DateRange | null,
): RicambioConsumoDaLog {
  let total = 0;
  const exitMonths = new Set<string>();
  for (const e of magLog) {
    if (e.ricambioId !== ricambioId) continue;
    if (range && !isoInRange(e.at, range)) continue;
    const q = usciteQtyFromMagazzinoEntry(e);
    if (q <= 0) continue;
    const mk = monthKeyFromIso(e.at);
    if (!mk) continue;
    total += q;
    exitMonths.add(mk);
  }
  return finalizeAgg(total, exitMonths);
}

/** Una passata su tutto il log: consumi per ogni ricambio (range `null` = intero log). */
export function buildConsumoMapFromMagLog(
  magLog: MagazzinoChangeLogEntry[],
  range: DateRange | null,
): Map<string, RicambioConsumoDaLog> {
  const acc = new Map<string, { total: number; months: Set<string> }>();
  for (const e of magLog) {
    if (range && !isoInRange(e.at, range)) continue;
    const q = usciteQtyFromMagazzinoEntry(e);
    if (q <= 0) continue;
    const mk = monthKeyFromIso(e.at);
    if (!mk) continue;
    let row = acc.get(e.ricambioId);
    if (!row) {
      row = { total: 0, months: new Set() };
      acc.set(e.ricambioId, row);
    }
    row.total += q;
    row.months.add(mk);
  }
  const out = new Map<string, RicambioConsumoDaLog>();
  for (const [id, v] of acc) {
    out.set(id, finalizeAgg(v.total, v.months));
  }
  return out;
}

export type RicambioConsumoRankingRow = {
  rank: number;
  id: string;
  codice: string;
  nome: string;
  marca: string;
  avgMonthly: number;
  totalUscite: number;
  monthsObserved: number;
};

/**
 * Classifica ricambi per consumo medio nel periodo (solo dati log).
 */
export function buildRicambiConsumoRanking(
  magLog: MagazzinoChangeLogEntry[],
  prodotti: RicambioMagazzino[],
  range: DateRange,
  opts?: { minTotalUscite?: number; limit?: number },
): RicambioConsumoRankingRow[] {
  const map = buildConsumoMapFromMagLog(magLog, range);
  const byId = new Map(prodotti.map((p) => [p.id, p]));
  const rows: RicambioConsumoRankingRow[] = [];
  for (const [id, c] of map) {
    if (c.avgMonthly == null) continue;
    const p = byId.get(id);
    rows.push({
      rank: 0,
      id,
      codice: p?.codiceFornitoreOriginale ?? "—",
      nome: p?.descrizione ?? "Ricambio",
      marca: p?.marca ?? "—",
      avgMonthly: c.avgMonthly,
      totalUscite: c.totalUscite,
      monthsObserved: c.monthsObserved,
    });
  }
  const minT = opts?.minTotalUscite ?? 0;
  const filtered = rows.filter((r) => r.totalUscite >= minT);
  filtered.sort((a, b) => b.avgMonthly - a.avgMonthly || b.totalUscite - a.totalUscite);
  const limit = opts?.limit ?? 500;
  return filtered.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
}

export function formatMonthKeyIt(mk: string | null): string {
  if (!mk) return "—";
  const m = /^(\d{4})-(\d{2})$/.exec(mk);
  if (!m) return mk;
  return `${m[2]}/${m[1]}`;
}

export function formatAvgMonthlyIt(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded} / mese`;
  return `${rounded.toLocaleString("it-IT", { maximumFractionDigits: 1 })} / mese`;
}

/** Formattazione magazzino: sempre 2 decimali (es. 4.27 / mese). */
export function formatAvgMonthlyMagazzinoIt(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(Math.round(n * 100) / 100).toFixed(2)} / mese`;
}

export function formatAutonomiaMesi(scorta: number, avgMonthly: number | null): string {
  if (avgMonthly == null || avgMonthly <= 0) return "—";
  const v = scorta / avgMonthly;
  if (!Number.isFinite(v)) return "—";
  return `${(Math.round(v * 10) / 10).toLocaleString("it-IT", { maximumFractionDigits: 1 })} mesi`;
}

export function intersectDateRanges(a: DateRange, b: DateRange): DateRange | null {
  const t0 = Math.max(a.start.getTime(), b.start.getTime());
  const t1 = Math.min(a.end.getTime(), b.end.getTime());
  if (t0 > t1) return null;
  return { start: startOfLocalDay(new Date(t0)), end: endOfLocalDay(new Date(t1)) };
}

export function monthBoundsLocal(y: number, month1to12: number): DateRange {
  const m0 = month1to12 - 1;
  return {
    start: startOfLocalDay(new Date(y, m0, 1)),
    end: endOfLocalDay(new Date(y, m0 + 1, 0)),
  };
}

export function yearBoundsLocal(y: number): DateRange {
  return {
    start: startOfLocalDay(new Date(y, 0, 1)),
    end: endOfLocalDay(new Date(y, 11, 31)),
  };
}

export const MAGAZZINO_ROLLING_CONSUMO_MONTHS = 36;

export function rolling36MonthRange(anchor: Date): DateRange {
  const end = endOfLocalDay(anchor);
  const start = startOfLocalDay(new Date(end.getFullYear(), end.getMonth() - (MAGAZZINO_ROLLING_CONSUMO_MONTHS - 1), 1));
  return { start, end };
}

function ymKeyFromLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseYmKey(k: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(k);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) };
}

/** Mesi di calendario inclusivi tra due chiavi YYYY-MM (stesso ordine o invertite). */
export function inclusiveCalendarMonthsBetweenKeys(startKey: string, endKey: string): number {
  const a = parseYmKey(startKey);
  const b = parseYmKey(endKey);
  if (!a || !b) return 1;
  let y0 = a.y;
  let m0 = a.m;
  let y1 = b.y;
  let m1 = b.m;
  if (y1 < y0 || (y1 === y0 && m1 < m0)) {
    const t = y0;
    y0 = y1;
    y1 = t;
    const tm = m0;
    m0 = m1;
    m1 = tm;
  }
  return Math.max(1, (y1 - y0) * 12 + (m1 - m0) + 1);
}

export function globalFirstExitMonthKeyFromMagLog(magLog: MagazzinoChangeLogEntry[]): string | null {
  let min: string | null = null;
  for (const e of magLog) {
    if (usciteQtyFromMagazzinoEntry(e) <= 0) continue;
    const mk = monthKeyFromIso(e.at);
    if (!mk) continue;
    if (!min || mk < min) min = mk;
  }
  return min;
}

/**
 * Consumo medio magazzino: uscite negli ultimi 36 mesi ÷ min(36, mesi di calendario disponibili da primo scarico globale).
 * Valori arrotondati a 2 decimali.
 */
export function buildConsumoMapMagazzinoRolling36ForProducts(
  magLog: MagazzinoChangeLogEntry[],
  prodotti: RicambioMagazzino[],
  anchor: Date,
): Map<string, RicambioConsumoDaLog> {
  const win = rolling36MonthRange(anchor);
  const winStartKey = ymKeyFromLocalDate(win.start);
  const winEndKey = ymKeyFromLocalDate(win.end);
  const globalFirst = globalFirstExitMonthKeyFromMagLog(magLog);
  const spanStartKey = !globalFirst || globalFirst < winStartKey ? winStartKey : globalFirst;
  let denom = Math.min(
    MAGAZZINO_ROLLING_CONSUMO_MONTHS,
    inclusiveCalendarMonthsBetweenKeys(spanStartKey, winEndKey),
  );
  if (!Number.isFinite(denom) || denom < 1) denom = 1;

  const acc = new Map<string, { total: number; exitMonths: Set<string> }>();
  for (const e of magLog) {
    if (!isoInRange(e.at, win)) continue;
    const q = usciteQtyFromMagazzinoEntry(e);
    if (q <= 0) continue;
    const mk = monthKeyFromIso(e.at);
    if (!mk) continue;
    let row = acc.get(e.ricambioId);
    if (!row) {
      row = { total: 0, exitMonths: new Set<string>() };
      acc.set(e.ricambioId, row);
    }
    row.total += q;
    row.exitMonths.add(mk);
  }

  const insufficientReason =
    "Nessuno scarico registrato nel log magazzino negli ultimi 36 mesi (Δ scorta).";

  const out = new Map<string, RicambioConsumoDaLog>();
  for (const p of prodotti) {
    const row = acc.get(p.id);
    if (!row || row.total <= 0) {
      out.set(p.id, {
        totalUscite: 0,
        exitMonthKeys: [],
        monthsObserved: denom,
        lastExitMonthKey: null,
        avgMonthly: null,
        insufficientReason,
      });
      continue;
    }
    const keys = [...row.exitMonths].sort((a, b) => a.localeCompare(b));
    const avgRaw = row.total / denom;
    const avgMonthly = Math.round(avgRaw * 100) / 100;
    out.set(p.id, {
      totalUscite: row.total,
      exitMonthKeys: keys,
      monthsObserved: denom,
      lastExitMonthKey: keys[keys.length - 1] ?? null,
      avgMonthly,
      insufficientReason: null,
    });
  }
  return out;
}
