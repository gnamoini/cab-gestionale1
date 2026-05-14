import type { RicambioMagazzino } from "@/lib/magazzino/types";

/** Prezzo vendita da listino fornitore originale e markup % (IVA esclusa, arrotondato centesimi). */
export function prezzoVenditaDaListinoEMarkup(listino: number, markupPercentuale: number): number {
  const l = Number(listino);
  const m = Number(markupPercentuale);
  if (!Number.isFinite(l)) return 0;
  if (!Number.isFinite(m)) return Math.round(l * 100) / 100;
  const v = l + (l * m) / 100;
  return Math.round(v * 100) / 100;
}

export function prezzoNetto(prezzo: number, scontoPercent: number): number {
  const p = Number(prezzo);
  const s = Number(scontoPercent);
  if (!Number.isFinite(p)) return 0;
  if (!Number.isFinite(s) || s <= 0) return Math.round(p * 100) / 100;
  const net = p - (p * s) / 100;
  return Math.round(net * 100) / 100;
}

export function prezzoNettoFornitoreOriginale(r: RicambioMagazzino): number {
  return prezzoNetto(r.prezzoFornitoreOriginale, r.scontoFornitoreOriginale);
}

export function prezzoNettoFornitoreNonOriginale(r: RicambioMagazzino): number {
  return prezzoNetto(r.prezzoFornitoreNonOriginale, r.scontoFornitoreNonOriginale);
}

/** Capitale immobilizzato: listino fornitore originale × giacenza (come da specifica). */
export function capitaleImmobilizzato(r: RicambioMagazzino): number {
  const v = r.prezzoFornitoreOriginale * r.scorta;
  return Math.round(v * 100) / 100;
}
