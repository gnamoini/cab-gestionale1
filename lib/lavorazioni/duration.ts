import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";

export function formatDurataMs(ms: number): string {
  if (ms <= 0) return "—";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

export function computeDurataAttiva(lav: LavorazioneAttiva): string {
  if (!lav.dataCompletamento) return "—";
  const start = new Date(lav.dataIngresso).getTime();
  const end = new Date(lav.dataCompletamento).getTime();
  return formatDurataMs(end - start);
}

export function meseCompletamentoFromIso(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Durata tra ingresso e completamento: priorità ai giorni; opzionale ore residue (es. 3g 4h). */
export function formatDurataGiorni(
  dataIngresso: string | null | undefined,
  dataCompletamento: string | null | undefined,
): string {
  if (!dataIngresso?.trim() || !dataCompletamento?.trim()) return "—";
  const start = new Date(dataIngresso).getTime();
  const end = new Date(dataCompletamento).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "—";
  const ms = end - start;
  const giorni = Math.floor(ms / 86400000);
  const rest = ms % 86400000;
  const ore = Math.floor(rest / 3600000);
  if (ore > 0) return `${giorni}g ${ore}h`;
  if (giorni === 0) return "0 giorni";
  if (giorni === 1) return "1 giorno";
  return `${giorni} giorni`;
}

/** Millisecondi tra ingresso e completamento (per ordinamento storico). */
export function durataMsStorico(dataIngresso: string, dataCompletamento: string): number {
  const a = new Date(dataIngresso).getTime();
  const b = new Date(dataCompletamento).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, b - a);
}
