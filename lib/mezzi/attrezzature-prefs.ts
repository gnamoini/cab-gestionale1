import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

export type AttrezzaturaModello = { id: string; nome: string };
export type AttrezzaturaMarca = { id: string; nome: string; modelli: AttrezzaturaModello[] };

const COMPAT_SEP = " — ";

function slug(s: string, i: number): string {
  const b = s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${b || "x"}-${i}`;
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Unisce etichetta compatibilità usata in magazzino (marca + modello). */
export function compatLabelMarcaModello(marcaNome: string, modelloNome: string): string {
  return `${marcaNome.trim()}${COMPAT_SEP}${modelloNome.trim()}`;
}

/** Parsa etichette "Marca — Modello" o testo libero (marca vuota). */
export function parseCompatMarcaModello(label: string): { marca: string; modello: string } {
  const t = label.trim();
  const i = t.indexOf(COMPAT_SEP);
  if (i === -1) return { marca: "", modello: t };
  return { marca: t.slice(0, i).trim(), modello: t.slice(i + COMPAT_SEP.length).trim() };
}

function withoutLegacyStatiMezzo(liste: MezziListePrefs): MezziListePrefs {
  return { ...liste, stati: [] };
}

export function migrateMezziListePrefs(liste: MezziListePrefs): MezziListePrefs {
  if (liste.attrezzature && liste.attrezzature.length > 0) {
    return withoutLegacyStatiMezzo(syncFlatFromTree(liste));
  }
  const marche = [...liste.marche].filter((m) => m.trim());
  const modelli = [...(liste.modelli ?? [])].filter((m) => m.trim());
  if (marche.length === 0 && modelli.length === 0) {
    return withoutLegacyStatiMezzo({ ...liste, attrezzature: [] });
  }
  if (marche.length === 0 && modelli.length > 0) {
    const attrezzature: AttrezzaturaMarca[] = [
      {
        id: "mig-marca-import",
        nome: "Da classificare",
        modelli: modelli.map((nome, j) => ({ id: `mig-mod-${slug(nome, j)}`, nome })),
      },
    ];
    return withoutLegacyStatiMezzo(syncFlatFromTree({ ...liste, attrezzature }));
  }
  const attrezzature: AttrezzaturaMarca[] = marche.map((nome, idx) => ({
    id: `mig-marca-${slug(nome, idx)}`,
    nome,
    modelli: [],
  }));
  if (modelli.length && attrezzature[0]) {
    attrezzature[0] = {
      ...attrezzature[0],
      modelli: modelli.map((nome, j) => ({ id: `mig-mod-${slug(nome, j)}`, nome })),
    };
  }
  return withoutLegacyStatiMezzo(syncFlatFromTree({ ...liste, attrezzature }));
}

function syncFlatFromTree(liste: MezziListePrefs): MezziListePrefs {
  const tree = liste.attrezzature ?? [];
  const marche = [...new Set(tree.map((m) => m.nome.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
  const modelli = [
    ...new Set(
      tree.flatMap((m) => m.modelli.map((x) => x.nome.trim()).filter(Boolean)),
    ),
  ].sort((a, b) => a.localeCompare(b, "it"));
  return { ...liste, marche, modelli, attrezzature: tree };
}

export function flattenCompatDaAttrezzature(liste: MezziListePrefs): string[] {
  const p = migrateMezziListePrefs(liste);
  const out: string[] = [];
  for (const m of p.attrezzature ?? []) {
    for (const mod of m.modelli) {
      const line = compatLabelMarcaModello(m.nome, mod.nome);
      if (line.trim()) out.push(line);
    }
  }
  return [...new Set(out)].sort((a, b) => a.localeCompare(b, "it"));
}

export function modelliVisibiliPerMarca(liste: MezziListePrefs, marcaNome: string | "__tutti__"): string[] {
  const p = migrateMezziListePrefs(liste);
  if (marcaNome === "__tutti__") {
    return [...(p.modelli ?? [])].sort((a, b) => a.localeCompare(b, "it"));
  }
  const hit = (p.attrezzature ?? []).find((m) => m.nome.trim() === marcaNome.trim());
  if (!hit) return [];
  return [...new Set(hit.modelli.map((x) => x.nome.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
}

export function aggiungiMarca(liste: MezziListePrefs, nome: string): MezziListePrefs {
  const t = nome.trim();
  if (!t) return liste;
  const p = migrateMezziListePrefs(liste);
  if ((p.attrezzature ?? []).some((m) => m.nome.trim().toLowerCase() === t.toLowerCase())) return p;
  const next: AttrezzaturaMarca[] = [...(p.attrezzature ?? []), { id: nextId("marca"), nome: t, modelli: [] }];
  return syncFlatFromTree({ ...p, attrezzature: next });
}

export function rinominaMarca(liste: MezziListePrefs, id: string, nuovoNome: string): MezziListePrefs {
  const t = nuovoNome.trim();
  if (!t) return liste;
  const p = migrateMezziListePrefs(liste);
  const next = (p.attrezzature ?? []).map((m) => (m.id === id ? { ...m, nome: t } : m));
  return syncFlatFromTree({ ...p, attrezzature: next });
}

export function eliminaMarca(liste: MezziListePrefs, id: string): MezziListePrefs {
  const p = migrateMezziListePrefs(liste);
  const next = (p.attrezzature ?? []).filter((m) => m.id !== id);
  return syncFlatFromTree({ ...p, attrezzature: next });
}

export function aggiungiModello(liste: MezziListePrefs, marcaId: string, nome: string): MezziListePrefs {
  const t = nome.trim();
  if (!t) return liste;
  const p = migrateMezziListePrefs(liste);
  const next = (p.attrezzature ?? []).map((m) => {
    if (m.id !== marcaId) return m;
    if (m.modelli.some((x) => x.nome.trim().toLowerCase() === t.toLowerCase())) return m;
    return { ...m, modelli: [...m.modelli, { id: nextId("mod"), nome: t }] };
  });
  return syncFlatFromTree({ ...p, attrezzature: next });
}

export function rinominaModello(liste: MezziListePrefs, marcaId: string, modelloId: string, nuovoNome: string): MezziListePrefs {
  const t = nuovoNome.trim();
  if (!t) return liste;
  const p = migrateMezziListePrefs(liste);
  const next = (p.attrezzature ?? []).map((m) => {
    if (m.id !== marcaId) return m;
    return {
      ...m,
      modelli: m.modelli.map((x) => (x.id === modelloId ? { ...x, nome: t } : x)),
    };
  });
  return syncFlatFromTree({ ...p, attrezzature: next });
}

export function eliminaModello(liste: MezziListePrefs, marcaId: string, modelloId: string): MezziListePrefs {
  const p = migrateMezziListePrefs(liste);
  const next = (p.attrezzature ?? []).map((m) =>
    m.id !== marcaId ? m : { ...m, modelli: m.modelli.filter((x) => x.id !== modelloId) },
  );
  return syncFlatFromTree({ ...p, attrezzature: next });
}
