import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { prezzoNettoFornitoreOriginale } from "@/lib/magazzino/calculations";

export function extractScortaDelta(e: MagazzinoChangeLogEntry): number | null {
  const ch = e.changes.find((c) => c.campo === "Scorta");
  if (!ch) return null;
  const a = Number.parseInt(ch.prima, 10);
  const b = Number.parseInt(ch.dopo, 10);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return b - a;
}

export function monthKeyFromIso(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Entrate/uscite qty e stima Δ capitale (Δscorta × listino netto OE attuale). */
export function aggregateMagazzinoMonthFromLogs(
  magLog: MagazzinoChangeLogEntry[],
  productsById: Map<string, RicambioMagazzino>,
): Map<
  string,
  {
    entrate: number;
    uscite: number;
    deltaCapitale: number;
  }
> {
  const byMonth = new Map<string, { entrate: number; uscite: number; deltaCapitale: number }>();
  const ensure = (k: string) => {
    if (!byMonth.has(k)) byMonth.set(k, { entrate: 0, uscite: 0, deltaCapitale: 0 });
    return byMonth.get(k)!;
  };

  for (const e of magLog) {
    const mk = monthKeyFromIso(e.at);
    if (!mk) continue;
    const row = ensure(mk);
    const d = extractScortaDelta(e);
    const p = productsById.get(e.ricambioId);
    const unit = p ? prezzoNettoFornitoreOriginale(p) : 0;

    if (e.tipo === "aggiunta") {
      const q = d != null && d > 0 ? d : 1;
      row.entrate += q;
      row.deltaCapitale += q * unit;
      continue;
    }
    if (e.tipo === "rimozione") {
      const q = d != null && d < 0 ? -d : 1;
      row.uscite += q;
      row.deltaCapitale += d != null ? d * unit : -q * unit;
      continue;
    }
    if (e.tipo === "update" && d != null) {
      if (d > 0) {
        row.entrate += d;
        row.deltaCapitale += d * unit;
      } else {
        row.uscite += -d;
        row.deltaCapitale += d * unit;
      }
    }
  }
  return byMonth;
}
