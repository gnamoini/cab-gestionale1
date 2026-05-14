import type { GestionaleLogEventTone, GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { BUNDER_CHANGE_LOG_MAX, BUNDER_CHANGE_LOG_STORAGE_KEY } from "@/lib/bunder/constants";
import { dispatchBunderLogRefresh } from "@/lib/sistema/cab-events";

export type BunderLogStored = GestionaleLogViewModel & { id: string };

function nextLogId(): string {
  return `bndlog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadBunderChangeLog(): BunderLogStored[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BUNDER_CHANGE_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: BunderLogStored[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : nextLogId();
      const tipoRiga = typeof o.tipoRiga === "string" ? o.tipoRiga : "";
      const oggettoRiga = typeof o.oggettoRiga === "string" ? o.oggettoRiga : "";
      const modificaRiga = typeof o.modificaRiga === "string" ? o.modificaRiga : "";
      const autore = typeof o.autore === "string" && o.autore.trim() ? o.autore.trim() : "Sistema";
      const atIso = typeof o.atIso === "string" && o.atIso.trim() ? o.atIso.trim() : new Date().toISOString();
      const tone = (typeof o.tone === "string" ? o.tone : "neutral") as GestionaleLogEventTone;
      if (!tipoRiga || !oggettoRiga) continue;
      out.push({ id, tipoRiga, oggettoRiga, modificaRiga, autore, atIso, tone });
    }
    return out.slice(0, BUNDER_CHANGE_LOG_MAX);
  } catch {
    return [];
  }
}

export function saveBunderChangeLog(entries: BunderLogStored[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BUNDER_CHANGE_LOG_STORAGE_KEY, JSON.stringify(entries.slice(0, BUNDER_CHANGE_LOG_MAX)));
  } catch {
    /* ignore */
  }
}

export function removeBunderChangeLogEntryById(id: string): void {
  saveBunderChangeLog(loadBunderChangeLog().filter((e) => e.id !== id));
  dispatchBunderLogRefresh();
}

export function appendBunderChangeLog(entry: GestionaleLogViewModel): void {
  const prev = loadBunderChangeLog();
  const row: BunderLogStored = { ...entry, id: nextLogId() };
  saveBunderChangeLog([row, ...prev]);
  dispatchBunderLogRefresh();
}
