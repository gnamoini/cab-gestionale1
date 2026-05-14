import { statoWorkflowOrderIndex } from "@/lib/lavorazioni/stato-order";
import type { LavorazioneArchiviata, LavorazioneAttiva, SortKeyLavorazione, SortKeyStorico, SortPhaseLav } from "@/lib/lavorazioni/types";

export function nextSortPhaseLav(p: SortPhaseLav): SortPhaseLav {
  if (p === "asc") return "desc";
  if (p === "desc") return "natural";
  return "asc";
}

export function compareNaturalOrderLav(
  a: LavorazioneAttiva,
  b: LavorazioneAttiva,
  orderIndex: Map<string, number>,
): number {
  const ia = orderIndex.get(a.id);
  const ib = orderIndex.get(b.id);
  const na = ia === undefined ? Number.MAX_SAFE_INTEGER : ia;
  const nb = ib === undefined ? Number.MAX_SAFE_INTEGER : ib;
  if (na !== nb) return na - nb;
  return a.id.localeCompare(b.id);
}

export function sortValueAttiva(
  row: LavorazioneAttiva,
  key: SortKeyLavorazione,
  statoOrderIds?: readonly string[],
): string | number {
  switch (key) {
    case "macchina":
      return row.macchina.toLowerCase();
    case "cliente":
      return `${row.cliente}\t${row.utilizzatore}\t${row.cantiere ?? ""}`.toLowerCase();
    case "note":
      return row.noteInterne.toLowerCase();
    case "stato":
      return statoWorkflowOrderIndex(row.statoId, statoOrderIds);
    case "priorita": {
      const o: Record<string, number> = { alta: 0, media: 1, bassa: 2 };
      return o[row.priorita] ?? 3;
    }
    case "addetto":
      return row.addetto.toLowerCase();
    default:
      return "";
  }
}

export function compareByColumnLav(
  a: LavorazioneAttiva,
  b: LavorazioneAttiva,
  key: SortKeyLavorazione,
  phase: "asc" | "desc",
  statoOrderIds?: readonly string[],
): number {
  const va = sortValueAttiva(a, key, statoOrderIds);
  const vb = sortValueAttiva(b, key, statoOrderIds);
  let cmp = 0;
  if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
  else cmp = String(va).localeCompare(String(vb), "it");
  return phase === "asc" ? cmp : -cmp;
}

export function compareNaturalOrderStorico(
  a: LavorazioneArchiviata,
  b: LavorazioneArchiviata,
  orderIndex: Map<string, number>,
): number {
  const ia = orderIndex.get(a.id);
  const ib = orderIndex.get(b.id);
  const na = ia === undefined ? Number.MAX_SAFE_INTEGER : ia;
  const nb = ib === undefined ? Number.MAX_SAFE_INTEGER : ib;
  if (na !== nb) return na - nb;
  return a.id.localeCompare(b.id);
}

/** Ordine predefinito tabella storico: data completamento decrescente (più recente in alto). */
export function compareDefaultOrderStorico(a: LavorazioneArchiviata, b: LavorazioneArchiviata): number {
  const ta = new Date(a.dataCompletamento).getTime();
  const tb = new Date(b.dataCompletamento).getTime();
  if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta;
  return a.id.localeCompare(b.id);
}

export function sortValueStorico(
  row: LavorazioneArchiviata,
  key: SortKeyStorico,
  _statoOrderIds?: readonly string[],
  oreTotaliById?: Map<string, number | null>,
  nScuderiaById?: Map<string, string>,
): string | number {
  switch (key) {
    case "macchina":
      return row.macchina.toLowerCase();
    case "mezzoIdent": {
      const sc = nScuderiaById?.get(row.id)?.trim() ?? "";
      return `${row.targa}\t${row.matricola}\t${sc}`.toLowerCase();
    }
    case "cliente":
      return `${row.cliente}\t${row.utilizzatore}\t${row.cantiere ?? ""}`.toLowerCase();
    case "addetto":
      return row.addetto.toLowerCase();
    case "dataIngresso":
      return new Date(row.dataIngresso).getTime() || 0;
    case "dataCompletamento":
      return new Date(row.dataCompletamento).getTime() || 0;
    case "oreTotali": {
      const v = oreTotaliById?.get(row.id);
      if (v === null || v === undefined) return 0;
      return v;
    }
    default:
      return "";
  }
}

export function compareByColumnStorico(
  a: LavorazioneArchiviata,
  b: LavorazioneArchiviata,
  key: SortKeyStorico,
  phase: "asc" | "desc",
  statoOrderIds?: readonly string[],
  oreTotaliById?: Map<string, number | null>,
  nScuderiaById?: Map<string, string>,
): number {
  const va = sortValueStorico(a, key, statoOrderIds, oreTotaliById, nScuderiaById);
  const vb = sortValueStorico(b, key, statoOrderIds, oreTotaliById, nScuderiaById);
  let cmp = 0;
  if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
  else cmp = String(va).localeCompare(String(vb), "it");
  return phase === "asc" ? cmp : -cmp;
}
