import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { LAVORAZIONE_STATO_COMPLETATA_ID } from "@/lib/lavorazioni/constants";
import type { LavorazioniManualMonthMap } from "@/lib/report/lavorazioni-manual-storage";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"] as const;

export type LavorazioniYearRow = {
  year: number;
  months: number[];
  total: number;
  growthVsPrevPct: number | null;
  bestMonthIdx: number | null;
  worstMonthIdx: number | null;
};

function ym(y: number, m0: string): string {
  return `${y}-${m0}`;
}

function countFromSystem(storico: LavorazioneArchiviata[], attive: LavorazioneAttiva[]): Map<string, number> {
  const map = new Map<string, number>();
  const bump = (key: string) => map.set(key, (map.get(key) ?? 0) + 1);
  for (const x of storico) {
    if (!x.dataCompletamento) continue;
    const d = new Date(x.dataCompletamento);
    if (Number.isNaN(d.getTime())) continue;
    bump(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  for (const x of attive) {
    if (x.statoId !== LAVORAZIONE_STATO_COMPLETATA_ID || !x.dataCompletamento) continue;
    const d = new Date(x.dataCompletamento);
    if (Number.isNaN(d.getTime())) continue;
    bump(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return map;
}

export function buildLavorazioniYearMatrix(
  storico: LavorazioneArchiviata[],
  attive: LavorazioneAttiva[],
  manual: LavorazioniManualMonthMap,
  anchor: Date,
): { rows: LavorazioniYearRow[]; monthLabels: readonly string[]; hasAnyData: boolean } {
  const sys = countFromSystem(storico, attive);
  const years = new Set<number>();
  for (const k of sys.keys()) years.add(Number(k.slice(0, 4)));
  for (const k of Object.keys(manual)) years.add(Number(k.slice(0, 4)));
  const yEnd = anchor.getFullYear();
  years.add(yEnd);
  for (let y = 2023; y <= yEnd; y++) years.add(y);

  const sortedYears = [...years].filter((y) => y >= 2000 && y <= yEnd + 1).sort((a, b) => a - b);

  const rows: LavorazioniYearRow[] = [];
  let prevTotal: number | null = null;
  let hasAny = Object.keys(manual).length > 0;

  for (const year of sortedYears) {
    const months = Array.from({ length: 12 }, (_, mi) => {
      const key = ym(year, String(mi + 1).padStart(2, "0"));
      if (Object.prototype.hasOwnProperty.call(manual, key)) return manual[key] ?? 0;
      const v = sys.get(key) ?? 0;
      if (v > 0) hasAny = true;
      return v;
    });
    const total = months.reduce((s, v) => s + v, 0);
    if (total > 0) hasAny = true;

    let bestMonthIdx: number | null = null;
    let worstMonthIdx: number | null = null;
    if (total > 0) {
      bestMonthIdx = 0;
      worstMonthIdx = 0;
      for (let i = 0; i < 12; i++) {
        if (months[i]! > months[bestMonthIdx]!) bestMonthIdx = i;
        if (months[i]! < months[worstMonthIdx]!) worstMonthIdx = i;
      }
    }

    const growthVsPrevPct =
      prevTotal != null && prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : null;
    prevTotal = total;

    rows.push({ year, months, total, growthVsPrevPct, bestMonthIdx, worstMonthIdx });
  }

  return { rows, monthLabels: MONTHS, hasAnyData: hasAny };
}

function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

/** Mesi trascorsi nell’anno (frazionario, max 12). */
function monthsElapsedFractional(anchor: Date): number {
  const y = anchor.getFullYear();
  const m0 = anchor.getMonth();
  const dim = daysInMonth(y, m0);
  const frac = m0 + anchor.getDate() / dim;
  return Math.min(12, Math.max(1e-6, frac));
}

/**
 * Previsione fine anno: regressione lineare pesata (pesi esponenziali decrescenti
 * con l’età dell’anno) + blend con il ritmo YTD reale (peso crescente con i mesi trascorsi).
 */
function forecastYearEndWeighted(
  historyYears: { year: number; total: number }[],
  yEnd: number,
  ytd: number,
  monthsElapsed: number,
): number | null {
  if (monthsElapsed <= 0) return null;

  const past = historyYears.filter((h) => h.year < yEnd);
  const LAMBDA = 0.42;
  let trendAtEnd = 0;

  if (past.length === 0) {
    trendAtEnd = (ytd / monthsElapsed) * 12;
  } else {
    const w = past.map((p) => Math.exp(-LAMBDA * (yEnd - 1 - p.year)));
    const sw = w.reduce((a, b) => a + b, 0);
    if (past.length >= 2) {
      const xs = past.map((p) => p.year);
      const ys = past.map((p) => p.total);
      const mx = past.reduce((s, p, i) => s + w[i]! * xs[i]!, 0) / sw;
      const my = past.reduce((s, p, i) => s + w[i]! * ys[i]!, 0) / sw;
      let den = 0;
      let num = 0;
      for (let i = 0; i < past.length; i++) {
        const dx = xs[i]! - mx;
        const dy = ys[i]! - my;
        num += w[i]! * dx * dy;
        den += w[i]! * dx * dx;
      }
      const b = den > 1e-9 ? num / den : 0;
      const a = my - b * mx;
      trendAtEnd = a + b * yEnd;
    } else {
      trendAtEnd = past.reduce((s, p, i) => s + w[i]! * p.total, 0) / sw;
    }
  }

  const paceAnnual = (ytd / monthsElapsed) * 12;
  const beta = 1 - Math.exp(-0.52 * monthsElapsed);
  let forecast = (1 - beta) * trendAtEnd + beta * paceAnnual;
  if (!Number.isFinite(forecast)) forecast = paceAnnual;
  forecast = Math.max(ytd, forecast, 0);
  return Math.round(forecast);
}

export type YearForecastLinePoint = {
  x: number;
  label: string;
  year: number;
  value: number;
  kind: "history" | "ytd" | "forecast";
};

/** Modello per line chart: storico, YTD anno corrente, tratteggio fino a stima fine anno. */
export function yearlyForecastLineModel(
  rows: LavorazioniYearRow[],
  anchor: Date,
): {
  solid: YearForecastLinePoint[];
  dashed: YearForecastLinePoint[];
  ytd: number;
  forecastYearEnd: number | null;
  forecastYear: number;
} {
  const yEnd = anchor.getFullYear();
  const byYear = new Map<number, number>();
  for (const r of rows) byYear.set(r.year, r.total);

  const sorted = [...byYear.keys()].sort((a, b) => a - b);
  const historyYears = sorted.filter((y) => y < yEnd).map((y) => ({ year: y, total: byYear.get(y) ?? 0 }));

  const solid: YearForecastLinePoint[] = [];
  let xi = 0;
  for (const h of historyYears) {
    solid.push({ x: xi++, label: String(h.year), year: h.year, value: h.total, kind: "history" });
  }

  const ytd = byYear.get(yEnd) ?? 0;
  const ytdPoint: YearForecastLinePoint = {
    x: xi,
    label: `${yEnd} (YTD)`,
    year: yEnd,
    value: ytd,
    kind: "ytd",
  };
  solid.push(ytdPoint);

  const monthsElapsed = monthsElapsedFractional(anchor);
  const forecastYearEnd = forecastYearEndWeighted(historyYears, yEnd, ytd, monthsElapsed);

  const dashed: YearForecastLinePoint[] = [];
  if (forecastYearEnd != null) {
    dashed.push(ytdPoint, {
      x: xi + 0.42,
      label: `${yEnd} (stima)`,
      year: yEnd,
      value: forecastYearEnd,
      kind: "forecast",
    });
  }

  return { solid, dashed, ytd, forecastYearEnd, forecastYear: yEnd };
}
