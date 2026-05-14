import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import { aggregateMagazzinoMonthFromLogs, monthKeyFromIso } from "@/lib/report/magazzino-log-parse";
import type { MagazzinoManualMonthMap } from "@/lib/report/magazzino-manual-storage";
import type { DateRange } from "@/lib/report/date-ranges";
import { endOfLocalDay, isoInRange, startOfLocalDay } from "@/lib/report/date-ranges";

export type MagazzinoMonthRow = {
  key: string;
  label: string;
  entrate: number;
  uscite: number;
  deltaQty: number;
  deltaCapitale: number;
  capitaleFinale: number;
};

function parseYm(k: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(k);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) };
}

export function ymKey(y: number, monthIndex0: number): string {
  return `${y}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

export function enumerateMonthsBetweenKeys(fromKey: string, toKey: string): string[] {
  const a = parseYm(fromKey);
  const b = parseYm(toKey);
  if (!a || !b) return [];
  let y = a.y;
  let mo = a.m - 1;
  const endY = b.y;
  const endM = b.m - 1;
  const out: string[] = [];
  while (y < endY || (y === endY && mo <= endM)) {
    out.push(ymKey(y, mo));
    mo += 1;
    if (mo > 11) {
      mo = 0;
      y += 1;
    }
  }
  return out;
}

export function rangeToYmKeys(r: DateRange): string[] {
  const s = startOfLocalDay(r.start);
  const e = endOfLocalDay(r.end);
  const from = ymKey(s.getFullYear(), s.getMonth());
  const to = ymKey(e.getFullYear(), e.getMonth());
  return enumerateMonthsBetweenKeys(from, to);
}

type MonthAgg = { entrate: number; uscite: number; deltaCapitale: number; deltaQty: number };

export function buildMagazzinoMonthlyRows(
  magLog: MagazzinoChangeLogEntry[],
  prodotti: RicambioMagazzino[],
  range: DateRange,
  anchor: Date,
  manual: MagazzinoManualMonthMap,
): { rows: MagazzinoMonthRow[]; hasRawLog: boolean; note: string } {
  const productsById = new Map(prodotti.map((p) => [p.id, p]));
  const agg = aggregateMagazzinoMonthFromLogs(magLog, productsById);
  const hasRawLog = agg.size > 0;

  const keysDisplay = rangeToYmKeys(range);
  if (keysDisplay.length === 0) {
    return {
      rows: [],
      hasRawLog,
      note: "Intervallo non valido per la tabella magazzino.",
    };
  }

  let minKey = keysDisplay[0]!;
  let maxKey = keysDisplay[keysDisplay.length - 1]!;
  for (const k of agg.keys()) {
    if (k < minKey) minKey = k;
    if (k > maxKey) maxKey = k;
  }
  const anchorKey = monthKeyFromIso(anchor.toISOString()) ?? maxKey;
  if (anchorKey > maxKey) maxKey = anchorKey;

  const keysForCapital = enumerateMonthsBetweenKeys(minKey, maxKey);

  const deltaByMonth = new Map<string, MonthAgg>();
  for (const k of keysForCapital) {
    const base = agg.get(k) ?? { entrate: 0, uscite: 0, deltaCapitale: 0 };
    const patch = manual[k];
    const entrate = patch?.entrate ?? base.entrate;
    const uscite = patch?.uscite ?? base.uscite;
    const deltaCapitale = patch?.deltaCapitale ?? base.deltaCapitale;
    const deltaQty = patch?.deltaQty ?? entrate - uscite;
    deltaByMonth.set(k, { entrate, uscite, deltaCapitale, deltaQty });
  }

  const cNow = Math.round(prodotti.reduce((s, p) => s + capitaleImmobilizzato(p), 0) * 100) / 100;
  const capFinale = new Map<string, number>();
  for (const k of keysForCapital) {
    const manualCap = manual[k]?.capitaleFinale;
    if (manualCap != null) {
      capFinale.set(k, Math.round(manualCap * 100) / 100);
      continue;
    }
    let sumAfter = 0;
    for (const [mk, v] of deltaByMonth) {
      if (mk > k && mk <= anchorKey) sumAfter += v.deltaCapitale;
    }
    capFinale.set(k, Math.round((cNow - sumAfter) * 100) / 100);
  }

  const rows: MagazzinoMonthRow[] = keysDisplay.map((k) => {
    const d = deltaByMonth.get(k) ?? { entrate: 0, uscite: 0, deltaCapitale: 0, deltaQty: 0 };
    const labelDate = new Date(`${k}-01T12:00:00`);
    const label = Number.isNaN(labelDate.getTime())
      ? k
      : labelDate.toLocaleDateString("it-IT", { month: "short", year: "numeric" });
    return {
      key: k,
      label,
      entrate: Math.round(d.entrate * 100) / 100,
      uscite: Math.round(d.uscite * 100) / 100,
      deltaQty: Math.round(d.deltaQty * 100) / 100,
      deltaCapitale: Math.round(d.deltaCapitale * 100) / 100,
      capitaleFinale: capFinale.get(k) ?? cNow,
    };
  });

  return {
    rows,
    hasRawLog,
    note:
      "Δ capitale da movimenti di scorta nei log × listino netto OE attuale. Capitale finale mensile ricostruito a ritroso dal capitale reale corrente (salvo valori manuali).",
  };
}

export function magazzinoLogTouchesRange(magLog: MagazzinoChangeLogEntry[], r: DateRange): boolean {
  return magLog.some((e) => isoInRange(e.at, r));
}
