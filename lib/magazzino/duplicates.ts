import type { RicambioMagazzino } from "@/lib/magazzino/types";

/**
 * Normalizza il codice fornitore originale per confronto:
 * trim, case-insensitive, spazi interni compressi (doppi spazi → uno).
 */
export function normalizeMagazzinoCodiceOE(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Primo ricambio in elenco con stesso codice OE normalizzato (escluso `excludeId` se presente). */
export function findFirstDuplicateByCodiceOriginale(
  items: RicambioMagazzino[],
  codiceRaw: string,
  options?: { excludeId?: string },
): RicambioMagazzino | null {
  const key = normalizeMagazzinoCodiceOE(codiceRaw);
  if (!key) return null;
  for (const item of items) {
    if (options?.excludeId && item.id === options.excludeId) continue;
    if (normalizeMagazzinoCodiceOE(item.codiceFornitoreOriginale) === key) return item;
  }
  return null;
}

export type MagazzinoArchiveDuplicateCodeGroup = {
  /** Chiave normalizzata (unica per gruppo) */
  normalizedKey: string;
  /** Etichetta leggibile (primo codice grezzo del gruppo) */
  labelCode: string;
  items: RicambioMagazzino[];
};

/**
 * Raggruppa ricambi che condividono lo stesso codice OE normalizzato (≥2 per gruppo).
 */
export function analyzeArchiveDuplicateCodes(items: RicambioMagazzino[]): MagazzinoArchiveDuplicateCodeGroup[] {
  const map = new Map<string, RicambioMagazzino[]>();
  for (const it of items) {
    const k = normalizeMagazzinoCodiceOE(it.codiceFornitoreOriginale);
    if (!k) continue;
    const arr = map.get(k);
    if (arr) arr.push(it);
    else map.set(k, [it]);
  }
  const groups: MagazzinoArchiveDuplicateCodeGroup[] = [];
  for (const [normalizedKey, groupItems] of map) {
    if (groupItems.length < 2) continue;
    const sorted = [...groupItems].sort((a, b) => a.id.localeCompare(b.id));
    const labelCode = sorted[0]!.codiceFornitoreOriginale.trim() || normalizedKey;
    groups.push({ normalizedKey, labelCode, items: sorted });
  }
  return groups.sort((a, b) => a.labelCode.localeCompare(b.labelCode, "it"));
}
