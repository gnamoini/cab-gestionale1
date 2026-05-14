import { MEZZI_INITIAL_LISTE, MOCK_MEZZI } from "@/lib/mock-data/mezzi";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import type { AttrezzaturaMarca, AttrezzaturaModello } from "@/lib/mezzi/attrezzature-prefs";

export const MEZZI_LISTE_PREFS_KEY = "gestionale-mezzi-liste-prefs-v1";

export type MezziListePrefs = {
  clienti: string[];
  marche: string[];
  /** Modelli mezzo (anagrafica / form) — denormalizzato da `attrezzature`. */
  modelli: string[];
  tipiAttrezzatura: string[];
  stati: string[];
  /** Gerarchia marche → modelli attrezzature (fonte di verità). */
  attrezzature?: AttrezzaturaMarca[];
};

function defaultModelli(): string[] {
  const s = new Set<string>();
  for (const m of MOCK_MEZZI) {
    const x = m.modello?.trim();
    if (x) s.add(x);
  }
  return [...s].sort((a, b) => a.localeCompare(b, "it"));
}

const defaultListe = (): MezziListePrefs => ({
  clienti: [...MEZZI_INITIAL_LISTE.clienti],
  marche: [...MEZZI_INITIAL_LISTE.marche],
  modelli: defaultModelli(),
  tipiAttrezzatura: [...MEZZI_INITIAL_LISTE.tipiAttrezzatura],
  stati: [],
  attrezzature: undefined,
});

export function loadMezziListePrefs(): MezziListePrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MEZZI_LISTE_PREFS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    return {
      clienti: Array.isArray(o.clienti) ? (o.clienti as string[]).filter((x) => typeof x === "string") : [],
      marche: Array.isArray(o.marche) ? (o.marche as string[]).filter((x) => typeof x === "string") : [],
      modelli: Array.isArray(o.modelli) ? (o.modelli as string[]).filter((x) => typeof x === "string") : [],
      tipiAttrezzatura: Array.isArray(o.tipiAttrezzatura)
        ? (o.tipiAttrezzatura as string[]).filter((x) => typeof x === "string")
        : [],
      stati: Array.isArray(o.stati) ? (o.stati as string[]).filter((x) => typeof x === "string") : [],
      attrezzature: normalizeAttrezzatureRaw(o.attrezzature),
    };
  } catch {
    return null;
  }
}

export function saveMezziListePrefs(liste: MezziListePrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEZZI_LISTE_PREFS_KEY, JSON.stringify(liste));
  } catch {
    /* quota */
  }
}

export function getMezziListePrefsOrDefault(): MezziListePrefs {
  const loaded = loadMezziListePrefs();
  if (!loaded) return migrateMezziListePrefs(defaultListe());
  const d = defaultListe();
  const merged: MezziListePrefs = {
    clienti: loaded.clienti.length ? loaded.clienti : d.clienti,
    marche: loaded.marche.length ? loaded.marche : d.marche,
    modelli: loaded.modelli?.length ? loaded.modelli : d.modelli,
    tipiAttrezzatura: loaded.tipiAttrezzatura.length ? loaded.tipiAttrezzatura : d.tipiAttrezzatura,
    /** Legacy “stati mezzo”: non più usati in UI; manteniamo array vuoto. */
    stati: [],
    attrezzature: loaded.attrezzature,
  };
  return migrateMezziListePrefs(merged);
}

function normalizeAttrezzatureRaw(raw: unknown): AttrezzaturaMarca[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: AttrezzaturaMarca[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : "";
    const nome = typeof r.nome === "string" && r.nome.trim() ? r.nome.trim() : "";
    if (!id || !nome) continue;
    const modRaw = r.modelli;
    const modelli: AttrezzaturaModello[] = [];
    if (Array.isArray(modRaw)) {
      for (const m of modRaw) {
        if (!m || typeof m !== "object") continue;
        const mo = m as Record<string, unknown>;
        const mid = typeof mo.id === "string" && mo.id.trim() ? mo.id.trim() : "";
        const mn = typeof mo.nome === "string" && mo.nome.trim() ? mo.nome.trim() : "";
        if (mid && mn) modelli.push({ id: mid, nome: mn });
      }
    }
    out.push({ id, nome, modelli });
  }
  return out.length ? out : undefined;
}
