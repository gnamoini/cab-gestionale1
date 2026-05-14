import type { PreventivoRecord } from "@/lib/preventivi/types";
import { loadSistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";

const DEFAULT_COSTO_ORARIO = () =>
  typeof window !== "undefined" ? loadSistemaPreventiviDefaults().costoOrarioDefault : 48;

function normCliente(c: string): string {
  return c.trim().toLowerCase();
}

function sameCliente(a: string, b: string): boolean {
  const ta = normCliente(a);
  const tb = normCliente(b);
  return ta.length > 0 && ta === tb;
}

/** Sconto medio righe ricambio (ultimi maxN preventivi cliente, escluso corrente bozza se id passato). */
function meanScontoRigheRecenti(list: PreventivoRecord[], maxN: number): number {
  const flat: number[] = [];
  for (const p of list.slice(0, maxN)) {
    for (const r of p.righeRicambi) {
      const s = r.scontoPercent ?? 0;
      if (s > 0) flat.push(s);
    }
  }
  if (flat.length === 0) return 0;
  return Math.round((flat.reduce((a, b) => a + b, 0) / flat.length) * 10) / 10;
}

function meanCostoOrario(list: PreventivoRecord[], maxN: number): number {
  const vals = list
    .slice(0, maxN)
    .map((p) => p.manodopera?.costoOrario)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  if (vals.length === 0) return DEFAULT_COSTO_ORARIO();
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function meanManodoperaSconto(list: PreventivoRecord[], maxN: number): number {
  const vals = list
    .slice(0, maxN)
    .map((p) => p.manodopera?.scontoPercent)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

/**
 * Parametri economici da preventivi precedenti dello stesso cliente.
 * Priorità: ultimo cronologicamente; se un campo è assente/0 si integra con media ultimi (max 5); default sistema.
 */
export function inferEconomiciClientePreventivi(
  cliente: string,
  tutti: PreventivoRecord[],
  excludeId?: string,
): {
  costoOrario: number;
  manodoperaScontoPercent: number;
  noteFinaliTipiche: string;
  scontoRigaForCodice: (codiceOE: string) => number;
} {
  const cur = tutti
    .filter((p) => p.id !== excludeId && p.cliente.trim() && sameCliente(p.cliente, cliente))
    .sort((a, b) => new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime());

  const meanCosto = meanCostoOrario(cur, 5);
  const meanScontoMan = meanManodoperaSconto(cur, 5);
  const meanRighe = meanScontoRigheRecenti(cur, 5);

  if (cur.length === 0) {
    return {
      costoOrario: DEFAULT_COSTO_ORARIO(),
      manodoperaScontoPercent: 0,
      noteFinaliTipiche: "",
      scontoRigaForCodice: () => 0,
    };
  }

  const last = cur[0]!;
  const costoOrario =
    last.manodopera?.costoOrario && last.manodopera.costoOrario > 0 ? last.manodopera.costoOrario : meanCosto;
  const manodoperaScontoPercent =
    last.manodopera?.scontoPercent && last.manodopera.scontoPercent > 0
      ? last.manodopera.scontoPercent
      : meanScontoMan;
  const noteFinaliTipiche = last.noteFinali?.trim() || "";

  const mapCodiceSconto = new Map<string, number>();
  for (const r of last.righeRicambi) {
    const k = r.codiceOE.trim().toLowerCase();
    if (k) mapCodiceSconto.set(k, Math.min(100, Math.max(0, r.scontoPercent ?? 0)));
  }

  function scontoRigaForCodice(codiceOE: string): number {
    const k = codiceOE.trim().toLowerCase();
    if (k && mapCodiceSconto.has(k)) return mapCodiceSconto.get(k)!;
    return Math.min(100, Math.max(0, meanRighe));
  }

  return { costoOrario, manodoperaScontoPercent, noteFinaliTipiche, scontoRigaForCodice };
}
