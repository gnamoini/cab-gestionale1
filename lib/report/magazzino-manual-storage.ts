import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";

const STORAGE_KEY = "gestionale-report-magazzino-manual-v1";

export type MagazzinoManualMonthPatch = {
  entrate?: number;
  uscite?: number;
  deltaQty?: number;
  deltaCapitale?: number;
  capitaleFinale?: number;
};

export type MagazzinoManualMonthMap = Record<string, MagazzinoManualMonthPatch>;

export function loadMagazzinoManualMonthMap(): MagazzinoManualMonthMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as MagazzinoManualMonthMap;
  } catch {
    return {};
  }
}

export function saveMagazzinoManualMonthMap(map: MagazzinoManualMonthMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    bumpReportDataRefresh();
  } catch {
    /* ignore */
  }
}
