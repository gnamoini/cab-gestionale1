import { DEFAULT_STATI_LAVORAZIONI } from "@/lib/lavorazioni/constants";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";

/** Normalizza elenco stati da localStorage (colori #rrggbb validi). */
export function normalizeStatiList(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  const defMap = new Map(DEFAULT_STATI_LAVORAZIONI.map((s) => [s.id, s]));
  return stati.map((s) => {
    const label = s.label || defMap.get(s.id)?.label || s.id;
    const nh = normalizeHex(s.color);
    if (nh) return { id: s.id, label, color: nh };
    return { id: s.id, label };
  });
}
