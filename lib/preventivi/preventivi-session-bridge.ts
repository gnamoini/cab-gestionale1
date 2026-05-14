import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { PREVENTIVO_PENDING_SESSION_KEY } from "@/lib/preventivi/constants";
import type { PreventivoLavorazioneOrigine } from "@/lib/preventivi/types";
import type { LavorazioneSchedeBundle } from "@/types/schede";

export type PendingPreventivoPayload = {
  lav: LavorazioneAttiva | LavorazioneArchiviata;
  origine: PreventivoLavorazioneOrigine;
  /** Snapshot bundle schede (include modifiche non ancora persistite su storage). */
  bundle: LavorazioneSchedeBundle;
};

export function writePendingPreventivoPayload(p: PendingPreventivoPayload): void {
  try {
    sessionStorage.setItem(PREVENTIVO_PENDING_SESSION_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function readAndClearPendingPreventivoPayload(): PendingPreventivoPayload | null {
  try {
    const raw = sessionStorage.getItem(PREVENTIVO_PENDING_SESSION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PREVENTIVO_PENDING_SESSION_KEY);
    return JSON.parse(raw) as PendingPreventivoPayload;
  } catch {
    return null;
  }
}
