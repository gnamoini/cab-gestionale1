import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { addettoThemeColor } from "@/lib/lavorazioni/lavorazioni-theme";

/** Palette base gestionale — assegnazione senza duplicati finché possibile. */
const ADDETTO_COLOR_POOL = [
  "#2563eb",
  "#7c3aed",
  "#0d9488",
  "#ea580c",
  "#db2777",
  "#4f46e5",
  "#ca8a04",
  "#059669",
  "#0e7490",
  "#b91c1c",
  "#4338ca",
  "#a16207",
  "#047857",
];

function hslToHex(h: number, s: number, l: number): string {
  const s1 = s / 100;
  const l1 = l / 100;
  const a = s1 * Math.min(l1, 1 - l1);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const col = l1 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.min(255, Math.max(0, Math.round(255 * col)));
  };
  return `#${[f(0), f(8), f(4)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

function usedHexSet(map: Record<string, string>): Set<string> {
  const u = new Set<string>();
  for (const v of Object.values(map)) {
    const n = normalizeHex(v);
    if (n) u.add(n);
  }
  return u;
}

/** Colore univoco non ancora in `used` (palette mescolata da salt, poi varianti HSL). */
export function nextUniqueAddettoColor(used: Set<string>, salt: number): string {
  const pool = [...ADDETTO_COLOR_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.abs((salt + i * 31) >>> 0) % (i + 1);
    const t = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = t;
  }
  for (const c of pool) {
    const n = normalizeHex(c);
    if (n && !used.has(n)) return n;
  }
  for (let step = 0; step < 500; step++) {
    const hue = ((salt >>> 0) + step * 19) % 360;
    const sat = 46 + (step % 6) * 2.5;
    const light = 43 + ((step >> 2) % 5) * 2.2;
    const hex = hslToHex(hue, sat, light);
    const n = normalizeHex(hex);
    if (n && !used.has(n)) return n;
  }
  const fallback = `#${((salt >>> 0) & 0xffffff).toString(16).padStart(6, "0")}`;
  return normalizeHex(fallback) ?? "#52525b";
}

/**
 * Allinea la mappa ai nomi correnti: mantiene colori validi, elimina orfani,
 * assegna colori univoci ai nomi senza voce (o con collisione su stesso hex).
 */
export function syncAddettoColorMap(
  addetti: string[],
  existing: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  const used = new Set<string>();

  for (const name of addetti) {
    const nh = normalizeHex(existing?.[name]);
    if (nh && !used.has(nh)) {
      out[name] = nh;
      used.add(nh);
    }
  }

  for (const name of addetti) {
    if (out[name]) continue;
    const hex = nextUniqueAddettoColor(used, (name.length + 1) * 1315423911 + addetti.indexOf(name) * 97);
    const n = normalizeHex(hex)!;
    out[name] = n;
    used.add(n);
  }

  return out;
}

/** Colore per UI: da mappa persistita, altrimenti fallback deterministico (righe legacy). */
export function addettoDisplayColor(nome: string, map: Record<string, string>): string {
  const n = normalizeHex(map[nome]);
  if (n) return n;
  return addettoThemeColor(nome);
}

export function assignColorForNewAddetto(prev: Record<string, string>, newName: string): Record<string, string> {
  const used = usedHexSet(prev);
  const salt = (Date.now() + Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const hex = nextUniqueAddettoColor(used, salt);
  return { ...prev, [newName]: hex };
}

export function renameAddettoInColorMap(
  prev: Record<string, string>,
  previousName: string,
  nextName: string,
): Record<string, string> {
  const col = normalizeHex(prev[previousName]);
  const { [previousName]: _, ...rest } = prev;
  if (col) return { ...rest, [nextName]: col };
  const used = usedHexSet(rest);
  return { ...rest, [nextName]: nextUniqueAddettoColor(used, nextName.length * 999983) };
}

export function removeAddettoFromColorMap(prev: Record<string, string>, name: string): Record<string, string> {
  const { [name]: _, ...rest } = prev;
  return rest;
}
