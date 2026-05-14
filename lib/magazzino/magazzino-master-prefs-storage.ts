/** Anagrafiche magazzino (liste guidate) persistite in locale — condivise tra Magazzino e Impostazioni sistema. */

export const MAGAZZINO_MASTER_PREFS_KEY = "gestionale-magazzino-master-prefs-v1";

export type MagazzinoMasterPrefs = {
  marche: string[];
  categorie: string[];
  mezziCompatibili: string[];
  fornitori: string[];
};

export function loadMagazzinoMasterPrefs(): MagazzinoMasterPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MAGAZZINO_MASTER_PREFS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    return {
      marche: Array.isArray(o.marche) ? (o.marche as string[]).filter((x) => typeof x === "string") : [],
      categorie: Array.isArray(o.categorie) ? (o.categorie as string[]).filter((x) => typeof x === "string") : [],
      mezziCompatibili: Array.isArray(o.mezziCompatibili)
        ? (o.mezziCompatibili as string[]).filter((x) => typeof x === "string")
        : [],
      fornitori: Array.isArray(o.fornitori) ? (o.fornitori as string[]).filter((x) => typeof x === "string") : [],
    };
  } catch {
    return null;
  }
}

export function saveMagazzinoMasterPrefs(prefs: MagazzinoMasterPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAGAZZINO_MASTER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota */
  }
}
