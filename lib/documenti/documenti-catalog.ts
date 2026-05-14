import type { CatalogMacchina, CatalogMarca } from "@/lib/mock-data/documenti";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MezzoGestito } from "@/lib/mezzi/types";

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/gi, "");
}

/**
 * Catalogo marche / modelli per la pagina Documenti: deriva da Impostazioni (liste mezzi) + anagrafica mezzi,
 * senza duplicare anagrafiche in una struttura separata.
 */
export function buildDocumentiCatalogFromImpostazioni(prefs: MezziListePrefs, mezzi: MezzoGestito[]): CatalogMarca[] {
  const marche = new Set<string>();
  for (const m of prefs.marche) {
    const t = m.trim();
    if (t) marche.add(t);
  }
  for (const z of mezzi) {
    const t = z.marca?.trim();
    if (t) marche.add(t);
  }
  const sorted = [...marche].sort((a, b) => a.localeCompare(b, "it"));
  return sorted.map((nome) => {
    const marcaSlug = slug(nome) || "senza-marca";
    const modelliSet = new Set<string>();
    for (const z of mezzi) {
      if (z.marca.trim().toLowerCase() !== nome.toLowerCase()) continue;
      const mo = z.modello?.trim();
      if (mo) modelliSet.add(mo);
    }
    if (modelliSet.size === 0) {
      for (const mo of prefs.modelli) {
        const t = mo.trim();
        if (t) modelliSet.add(t);
      }
    }
    const modelli = [...modelliSet].sort((a, b) => a.localeCompare(b, "it"));
    const macchine: CatalogMacchina[] = modelli.map((mn) => ({
      id: `mdl-${marcaSlug}__${slug(mn)}`,
      nome: mn,
    }));
    return {
      id: `marca-${marcaSlug}`,
      nome,
      macchine,
    };
  });
}

export function mezziForMarcaModello(mezzi: MezzoGestito[], marcaNome: string, modelloNome: string): MezzoGestito[] {
  const mn = marcaNome.trim().toLowerCase();
  const mod = modelloNome.trim().toLowerCase();
  return mezzi.filter((z) => z.marca.trim().toLowerCase() === mn && z.modello.trim().toLowerCase() === mod);
}
