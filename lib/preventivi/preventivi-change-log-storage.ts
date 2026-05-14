import type { GestionaleLogEventTone, GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { dispatchPreventiviLogRefresh } from "@/lib/sistema/cab-events";

export const PREVENTIVI_CHANGE_LOG_STORAGE_KEY = "gestionale-preventivi-change-log-v1";
export const PREVENTIVI_CHANGE_LOG_MAX = 200;

export type PreventiviLogStored = GestionaleLogViewModel & { id: string };

function nextId(): string {
  return `pvlog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadPreventiviChangeLog(): PreventiviLogStored[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREVENTIVI_CHANGE_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: PreventiviLogStored[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : nextId();
      const tipoRiga = typeof o.tipoRiga === "string" ? o.tipoRiga : "";
      const oggettoRiga = typeof o.oggettoRiga === "string" ? o.oggettoRiga : "";
      const modificaRiga = typeof o.modificaRiga === "string" ? o.modificaRiga : "";
      const autore = typeof o.autore === "string" && o.autore.trim() ? o.autore.trim() : "Sistema";
      const atIso = typeof o.atIso === "string" && o.atIso.trim() ? o.atIso.trim() : new Date().toISOString();
      const tone = (typeof o.tone === "string" ? o.tone : "neutral") as GestionaleLogEventTone;
      if (!tipoRiga || !oggettoRiga) continue;
      out.push({ id, tipoRiga, oggettoRiga, modificaRiga, autore, atIso, tone });
    }
    return out.slice(0, PREVENTIVI_CHANGE_LOG_MAX);
  } catch {
    return [];
  }
}

export function savePreventiviChangeLog(entries: PreventiviLogStored[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREVENTIVI_CHANGE_LOG_STORAGE_KEY, JSON.stringify(entries.slice(0, PREVENTIVI_CHANGE_LOG_MAX)));
    bumpReportDataRefresh();
  } catch {
    /* ignore quota */
  }
}

export function removePreventiviChangeLogEntryById(id: string): void {
  savePreventiviChangeLog(loadPreventiviChangeLog().filter((e) => e.id !== id));
  dispatchPreventiviLogRefresh();
}

export function appendPreventiviChangeLog(entry: GestionaleLogViewModel): void {
  const prev = loadPreventiviChangeLog();
  const row: PreventiviLogStored = { ...entry, id: nextId() };
  savePreventiviChangeLog([row, ...prev]);
  dispatchPreventiviLogRefresh();
}
