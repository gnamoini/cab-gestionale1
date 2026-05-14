import type { CampoChangeLike, MagazzinoLogEntryLike } from "@/lib/gestionale-log/view-model";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";

export const MAGAZZINO_CHANGE_LOG_STORAGE_KEY = "gestionale-magazzino-change-log-v1";
export const MAGAZZINO_CHANGE_LOG_MAX = 100;

export type MagazzinoChangeLogEntry = MagazzinoLogEntryLike & {
  id: string;
  ricambioId: string;
};

function normalizeEntry(raw: unknown): MagazzinoChangeLogEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const tipo = e.tipo;
  if (tipo !== "aggiunta" && tipo !== "update" && tipo !== "rimozione") return null;
  const id = typeof e.id === "string" && e.id.trim() ? e.id.trim() : "";
  const ricambioId = typeof e.ricambioId === "string" && e.ricambioId.trim() ? e.ricambioId.trim() : "";
  if (!id || !ricambioId) return null;
  const ricambio = typeof e.ricambio === "string" ? e.ricambio : "";
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
  return { id, tipo, ricambioId, ricambio, autore, at, riepilogo, changes };
}

export function loadMagazzinoChangeLog(): MagazzinoChangeLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MAGAZZINO_CHANGE_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: MagazzinoChangeLogEntry[] = [];
    for (const item of parsed) {
      const n = normalizeEntry(item);
      if (n) out.push(n);
    }
    return out.slice(0, MAGAZZINO_CHANGE_LOG_MAX);
  } catch {
    return [];
  }
}

export function saveMagazzinoChangeLog(entries: MagazzinoChangeLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAGAZZINO_CHANGE_LOG_STORAGE_KEY, JSON.stringify(entries.slice(0, MAGAZZINO_CHANGE_LOG_MAX)));
    bumpReportDataRefresh();
  } catch {
    /* ignore quota */
  }
}

export function removeMagazzinoChangeLogEntryById(id: string): void {
  saveMagazzinoChangeLog(loadMagazzinoChangeLog().filter((e) => e.id !== id));
}
