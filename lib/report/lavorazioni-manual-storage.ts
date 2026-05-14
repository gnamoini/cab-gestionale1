import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";

const STORAGE_KEY = "gestionale-report-lavorazioni-manual-v1";

/** Mappa `YYYY-MM` → numero lavorazioni completate (valore manuale sostituisce il calcolo automatico per quel mese). */
export type LavorazioniManualMonthMap = Record<string, number>;

export function loadLavorazioniManualMonthMap(): LavorazioniManualMonthMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: LavorazioniManualMonthMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}$/.test(k)) continue;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n) || n < 0) continue;
      out[k] = Math.round(n);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveLavorazioniManualMonthMap(map: LavorazioniManualMonthMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    bumpReportDataRefresh();
  } catch {
    /* ignore */
  }
}
