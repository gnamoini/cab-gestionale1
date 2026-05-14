import type { GestionaleLogEventTone, GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { dispatchDocumentiLogRefresh } from "@/lib/sistema/cab-events";

export const DOCUMENTI_CHANGE_LOG_STORAGE_KEY = "gestionale-documenti-change-log-v1";
export const DOCUMENTI_CHANGE_LOG_MAX = 200;

export type DocumentiLogStored = GestionaleLogViewModel & { id: string };

function nextId(): string {
  return `doclog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadDocumentiChangeLog(): DocumentiLogStored[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DOCUMENTI_CHANGE_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: DocumentiLogStored[] = [];
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
    return out.slice(0, DOCUMENTI_CHANGE_LOG_MAX);
  } catch {
    return [];
  }
}

export function saveDocumentiChangeLog(entries: DocumentiLogStored[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DOCUMENTI_CHANGE_LOG_STORAGE_KEY, JSON.stringify(entries.slice(0, DOCUMENTI_CHANGE_LOG_MAX)));
  } catch {
    /* ignore */
  }
}

export function removeDocumentiChangeLogEntryById(id: string): void {
  saveDocumentiChangeLog(loadDocumentiChangeLog().filter((e) => e.id !== id));
  dispatchDocumentiLogRefresh();
}

export function appendDocumentiChangeLog(entry: GestionaleLogViewModel): void {
  const prev = loadDocumentiChangeLog();
  const row: DocumentiLogStored = { ...entry, id: nextId() };
  saveDocumentiChangeLog([row, ...prev]);
  dispatchDocumentiLogRefresh();
}
