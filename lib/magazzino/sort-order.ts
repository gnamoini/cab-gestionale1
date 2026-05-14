import type { RicambioMagazzino, SortKeyMagazzino } from "@/lib/magazzino/types";

export type SortPhaseMagazzino = "asc" | "desc" | "natural";

export function nextSortPhase(p: SortPhaseMagazzino): SortPhaseMagazzino {
  if (p === "asc") return "desc";
  if (p === "desc") return "natural";
  return "asc";
}

export function compareNaturalOrder(
  a: RicambioMagazzino,
  b: RicambioMagazzino,
  orderIndex: Map<string, number>,
): number {
  const ia = orderIndex.get(a.id);
  const ib = orderIndex.get(b.id);
  const na = ia === undefined ? Number.MAX_SAFE_INTEGER : ia;
  const nb = ib === undefined ? Number.MAX_SAFE_INTEGER : ib;
  if (na !== nb) return na - nb;
  return a.id.localeCompare(b.id);
}

export function sortValueForKey(r: RicambioMagazzino, key: SortKeyMagazzino): string | number {
  switch (key) {
    case "prezzoVendita":
      return r.prezzoVendita;
    case "scorta":
      return r.scorta;
    case "marca":
      return r.marca.toLowerCase();
    case "categoria":
      return r.categoria.toLowerCase();
    case "codiceFornitoreOriginale":
      return r.codiceFornitoreOriginale.toLowerCase();
    case "consumoMedioMensile":
      return 0;
    default:
      return 0;
  }
}

export function compareByColumn(
  a: RicambioMagazzino,
  b: RicambioMagazzino,
  key: SortKeyMagazzino,
  phase: "asc" | "desc",
  consumoMedioById?: Map<string, number | null>,
): number {
  if (key === "consumoMedioMensile" && consumoMedioById) {
    const va = consumoMedioById.get(a.id);
    const vb = consumoMedioById.get(b.id);
    const ma = va == null || !Number.isFinite(va);
    const mb = vb == null || !Number.isFinite(vb);
    if (ma && mb) return 0;
    if (ma) return 1;
    if (mb) return -1;
    const cmp = va - vb;
    return phase === "asc" ? cmp : -cmp;
  }
  const va = sortValueForKey(a, key);
  const vb = sortValueForKey(b, key);
  let cmp = 0;
  if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
  else cmp = String(va).localeCompare(String(vb), "it");
  return phase === "asc" ? cmp : -cmp;
}
