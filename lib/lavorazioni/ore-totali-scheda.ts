import type { LavorazioneSchedeBundle } from "@/types/schede";

/**
 * Somma ore impiegate dalla scheda lavorazioni (addetti per riga).
 * `null` se la scheda non esiste o non è di tipo lavorazioni.
 */
export function oreTotaliFromBundleLavorazioni(bundle: LavorazioneSchedeBundle): number | null {
  const doc = bundle.lavorazioni;
  if (!doc || doc.tipo !== "lavorazioni") return null;
  let sum = 0;
  for (const riga of doc.campi.righe) {
    for (const a of riga.addettiAssegnati ?? []) {
      sum += Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0;
    }
  }
  return Math.round(sum * 100) / 100;
}
