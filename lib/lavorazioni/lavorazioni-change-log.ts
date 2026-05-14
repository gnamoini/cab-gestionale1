import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";

export const LAVORAZIONI_CHANGE_LOG_STORAGE_KEY = "gestionale-lavorazioni-change-log-v1";
export const LAVORAZIONI_LOG_MAX = 200;
export const LAVORAZIONI_LOG_GROUP_WINDOW_MS = 6500;

export type LavorazioniLogTipo =
  | "creazione"
  | "aggiornamento"
  | "completata"
  | "archiviazione"
  | "eliminazione"
  | "riaperta";

export type LavorazioniLogTarget = "attiva" | "storico";

export type LavorazioniLogChange = {
  campo: string;
  prima: string;
  dopo: string;
};

export type LavorazioniLogEntry = {
  id: string;
  tipo: LavorazioniLogTipo;
  target: LavorazioniLogTarget;
  autore: string;
  /** id riga (attiva: lav-xxx; storico: lav-arch-xxx). */
  recordId: string;
  /** Titolo riga principale: es. "Bucher CityCat — GA702XM" */
  titolo: string;
  /** Riga secondaria breve. */
  riepilogo: string;
  at: string; // ISO
  changes: LavorazioniLogChange[];
  /** Se valorizzato, la voce riguarda una scheda (ingresso / lavorazioni / ricambi). */
  schedaOggetto?: string;
};

export function formatTimestampHover(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function logTipoLabel(tipo: LavorazioniLogTipo): string {
  switch (tipo) {
    case "creazione":
      return "Creazione";
    case "completata":
      return "Completata";
    case "archiviazione":
      return "Archiviata";
    case "eliminazione":
      return "Eliminazione";
    case "riaperta":
      return "Riaperta";
    case "aggiornamento":
    default:
      return "Aggiornamento";
  }
}

export function logTipoTextClass(tipo: LavorazioniLogTipo): string {
  // Coerente con Magazzino (verde/arancio/rosso) + stati extra.
  if (tipo === "creazione") return "text-emerald-700 dark:text-emerald-400";
  if (tipo === "eliminazione") return "text-red-700 dark:text-red-400";
  if (tipo === "archiviazione") return "text-zinc-700 dark:text-zinc-300";
  if (tipo === "completata") return "text-sky-700 dark:text-sky-400";
  if (tipo === "riaperta") return "text-indigo-700 dark:text-indigo-400";
  return "text-orange-700 dark:text-orange-400";
}

export function loadLavorazioniChangeLog(): LavorazioniLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LAVORAZIONI_CHANGE_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const e = x as LavorazioniLogEntry;
        const autore =
          typeof e.autore === "string" && e.autore.trim() ? e.autore.trim() : "Sistema";
        return { ...e, autore };
      })
      .slice(0, LAVORAZIONI_LOG_MAX) as LavorazioniLogEntry[];
  } catch {
    return [];
  }
}

export function saveLavorazioniChangeLog(entries: LavorazioniLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LAVORAZIONI_CHANGE_LOG_STORAGE_KEY,
      JSON.stringify(entries.slice(0, LAVORAZIONI_LOG_MAX)),
    );
    bumpReportDataRefresh();
  } catch {
    /* ignore quota */
  }
}

export function removeLavorazioniChangeLogEntryById(id: string): void {
  saveLavorazioniChangeLog(loadLavorazioniChangeLog().filter((e) => e.id !== id));
}

function nextId(): string {
  return `lavlog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function compactSummary(parts: string[]): string {
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const p of parts.map((s) => s.trim()).filter(Boolean)) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(p);
  }
  if (uniq.length === 0) return "";
  if (uniq.length <= 2) return uniq.join(", ");
  return `${uniq.slice(0, 2).join(", ")} (+${uniq.length - 2})`;
}

export function buildTitolo(macchina: string, targa: string): string {
  const m = macchina.trim();
  const t = targa.trim();
  if (m && t) return `${m} — ${t}`;
  return m || t || "—";
}

export function appendLavorazioniLog(
  prev: LavorazioniLogEntry[],
  entry: Omit<LavorazioniLogEntry, "id" | "at"> & { at?: string; id?: string },
): LavorazioniLogEntry[] {
  const at = entry.at ?? new Date().toISOString();
  const id = entry.id ?? nextId();
  const next: LavorazioniLogEntry = { ...entry, id, at };

  const last = prev[0];
  if (
    last &&
    !last.schedaOggetto &&
    !next.schedaOggetto &&
    last.tipo === "aggiornamento" &&
    next.tipo === "aggiornamento" &&
    last.recordId === next.recordId
  ) {
    const dt = Math.abs(new Date(at).getTime() - new Date(last.at).getTime());
    if (dt <= LAVORAZIONI_LOG_GROUP_WINDOW_MS) {
      const mergedChanges = [...last.changes, ...next.changes].slice(0, 12);
      const mergedSummary = compactSummary([last.riepilogo, next.riepilogo]);
      const merged: LavorazioniLogEntry = {
        ...last,
        at,
        riepilogo: mergedSummary || last.riepilogo,
        changes: mergedChanges,
        schedaOggetto: last.schedaOggetto ?? next.schedaOggetto,
      };
      return [merged, ...prev.slice(1)].slice(0, LAVORAZIONI_LOG_MAX);
    }
  }

  return [next, ...prev].slice(0, LAVORAZIONI_LOG_MAX);
}

export function safeSwatch(hex: string | undefined): string {
  return normalizeHex(hex) ?? "#52525b";
}

