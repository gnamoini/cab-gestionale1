import type { Lavorazione, StatoLavorazione } from "@/lib/types/gestionale";

export function formatDurataMs(ms: number): string {
  if (ms <= 0) return "—";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function computeDurata(lav: Lavorazione): string {
  if (!lav.dataFine) return "—";
  const start = new Date(lav.dataEntrata).getTime();
  const end = new Date(lav.dataFine).getTime();
  return formatDurataMs(end - start);
}

export function applyCompletamento(
  lav: Lavorazione,
  nuovoStato: StatoLavorazione,
): Lavorazione {
  if (nuovoStato === "completata" && !lav.dataFine) {
    const now = new Date().toISOString();
    return { ...lav, stato: nuovoStato, dataFine: now };
  }
  if (nuovoStato !== "completata" && lav.stato === "completata") {
    return { ...lav, stato: nuovoStato, dataFine: null };
  }
  return { ...lav, stato: nuovoStato };
}
