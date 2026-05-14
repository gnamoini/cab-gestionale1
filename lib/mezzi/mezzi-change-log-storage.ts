import type { CampoChangeLike } from "@/lib/gestionale-log/view-model";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";

export const MEZZI_CHANGE_LOG_STORAGE_KEY = "gestionale-mezzi-change-log-v1";
export const MEZZI_CHANGE_LOG_MAX = 200;

export type MezziChangeLogTipo = "aggiunta" | "update" | "rimozione";

export type MezziChangeLogEntry = {
  id: string;
  tipo: MezziChangeLogTipo;
  mezzoId: string;
  /** Etichetta leggibile (targa o marca modello). */
  mezzoLabel: string;
  autore: string;
  at: string;
  riepilogo: string;
  changes: CampoChangeLike[];
};

function normalizeEntry(raw: unknown): MezziChangeLogEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const tipo = e.tipo;
  if (tipo !== "aggiunta" && tipo !== "update" && tipo !== "rimozione") return null;
  const id = typeof e.id === "string" && e.id.trim() ? e.id.trim() : "";
  const mezzoId = typeof e.mezzoId === "string" && e.mezzoId.trim() ? e.mezzoId.trim() : "";
  if (!id || !mezzoId) return null;
  const mezzoLabel = typeof e.mezzoLabel === "string" ? e.mezzoLabel : "";
  const autore = typeof e.autore === "string" && e.autore.trim() ? e.autore.trim() : "Sistema";
  const at = typeof e.at === "string" ? e.at : new Date().toISOString();
  const riepilogo = typeof e.riepilogo === "string" ? e.riepilogo : "";
  const changesRaw = e.changes;
  const changes: CampoChangeLike[] = Array.isArray(changesRaw)
    ? changesRaw
        .filter((c) => c && typeof c === "object")
        .map((c) => {
          const x = c as Record<string, unknown>;
          return {
            campo: typeof x.campo === "string" ? x.campo : "",
            prima: typeof x.prima === "string" ? x.prima : "",
            dopo: typeof x.dopo === "string" ? x.dopo : "",
          };
        })
    : [];
  return { id, tipo, mezzoId, mezzoLabel, autore, at, riepilogo, changes };
}

export function loadMezziChangeLog(): MezziChangeLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MEZZI_CHANGE_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: MezziChangeLogEntry[] = [];
    for (const item of parsed) {
      const n = normalizeEntry(item);
      if (n) out.push(n);
    }
    return out.slice(0, MEZZI_CHANGE_LOG_MAX);
  } catch {
    return [];
  }
}

export function saveMezziChangeLog(entries: MezziChangeLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEZZI_CHANGE_LOG_STORAGE_KEY, JSON.stringify(entries.slice(0, MEZZI_CHANGE_LOG_MAX)));
    bumpReportDataRefresh();
  } catch {
    /* ignore quota */
  }
}

export function appendMezziChangeLog(entry: Omit<MezziChangeLogEntry, "id"> & { id?: string }): MezziChangeLogEntry[] {
  const id = entry.id?.trim() || `mezzi-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next: MezziChangeLogEntry = { ...entry, id };
  const merged = [next, ...loadMezziChangeLog()].slice(0, MEZZI_CHANGE_LOG_MAX);
  saveMezziChangeLog(merged);
  return merged;
}

export function removeMezziChangeLogEntryById(id: string): MezziChangeLogEntry[] {
  const merged = loadMezziChangeLog().filter((e) => e.id !== id);
  saveMezziChangeLog(merged);
  return merged;
}
