import type { PreventivoRecord, PreventivoRigaRicambio } from "@/lib/preventivi/types";

export function totaleNettoRigaRicambio(r: Pick<PreventivoRigaRicambio, "quantita" | "prezzoUnitario" | "scontoPercent">): number {
  const gross = r.quantita * r.prezzoUnitario;
  const sp = Math.min(100, Math.max(0, r.scontoPercent ?? 0));
  return Math.round(gross * (1 - sp / 100) * 100) / 100;
}

export function calcolaTotaliPreventivo(
  p: Pick<PreventivoRecord, "righeRicambi" | "manodopera">,
): { totaleRicambi: number; totaleManodopera: number; totaleFinale: number } {
  const totaleRicambi = Math.round(p.righeRicambi.reduce((s, r) => s + totaleNettoRigaRicambio(r), 0) * 100) / 100;
  const lordoMan = p.manodopera.oreTotali * p.manodopera.costoOrario;
  const spM = Math.min(100, Math.max(0, p.manodopera.scontoPercent ?? 0));
  const totaleManodopera = Math.round(lordoMan * (1 - spM / 100) * 100) / 100;
  const totaleFinale = Math.round((totaleRicambi + totaleManodopera) * 100) / 100;
  return { totaleRicambi, totaleManodopera, totaleFinale };
}
