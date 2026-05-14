import { LAVORAZIONE_STATO_COMPLETATA_ID } from "@/lib/lavorazioni/constants";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";

/** Priorità predefinite: rosso / giallo / verde (override da preferenze). */
export const PRIORITA_HEX_DEFAULT: Record<PrioritaLav, string> = {
  alta: "#dc2626",
  media: "#ca8a04",
  bassa: "#16a34a",
};

/** Stati predefiniti — palette logica enterprise. */
const STATO_HEX: Record<string, string> = {
  "lav-stato-accettazione": "#2563eb",
  "lav-stato-att-prev": "#ea580c",
  "lav-stato-att-ricambi": "#7c3aed",
  "lav-stato-da-lavorare": "#52525b",
  "lav-stato-in-lavorazione": "#0284c7",
  [LAVORAZIONE_STATO_COMPLETATA_ID]: "#15803d",
};

const STATO_CUSTOM_CYCLE = ["#6366f1", "#c2410c", "#0d9488", "#db2777", "#4f46e5", "#b45309"];

/** Colore stato da id (custom: hash stabile sull’id). */
export function statoThemeColor(statoId: string): string {
  if (STATO_HEX[statoId]) return STATO_HEX[statoId];
  let h = 0;
  for (let i = 0; i < statoId.length; i++) h = (h * 31 + statoId.charCodeAt(i)) >>> 0;
  return STATO_CUSTOM_CYCLE[h % STATO_CUSTOM_CYCLE.length];
}

/** Colore effettivo stato: override da config o fallback tema. */
export function statoDisplayColor(statoId: string, stati: StatoLavorazioneConfig[]): string {
  const nh = normalizeHex(stati.find((s) => s.id === statoId)?.color);
  if (nh) return nh;
  return statoThemeColor(statoId);
}

/** Colore priorità con eventuale override salvato nelle preferenze. */
export function prioritaDisplayColor(
  p: PrioritaLav,
  overrides?: Partial<Record<PrioritaLav, string>> | null,
): string {
  const nh = normalizeHex(overrides?.[p]);
  if (nh) return nh;
  return PRIORITA_HEX_DEFAULT[p];
}

export function prioritaThemeColor(p: PrioritaLav): string {
  return prioritaDisplayColor(p, null);
}

/** Palette addetti: stesso ordine richiesto (blu, viola, teal, arancione, rosa, …); indice da hash nome → stabile al rename no, stabile per nome sì. */
const ADDETTO_PALETTE = ["#2563eb", "#7c3aed", "#0d9488", "#ea580c", "#db2777", "#4f46e5", "#ca8a04", "#059669"];

/** Colore addetto deterministico dal nome (sempre lo stesso per lo stesso nome). */
export function addettoThemeColor(nome: string): string {
  const key = nome.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return ADDETTO_PALETTE[h % ADDETTO_PALETTE.length];
}
