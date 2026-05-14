import { Q_FOCUS_LAV_ROW, Q_FOCUS_LAV_TARGET } from "@/lib/navigation/dashboard-log-links";
import type { PreventivoLavorazioneOrigine } from "@/lib/preventivi/types";
import { Q_PREVENTIVI_LAV, Q_PREVENTIVI_LAV_ORIG } from "@/lib/preventivi/preventivi-query";

/** Link alla pagina Lavorazioni con focus sulla riga (attiva o storico). */
export function buildPreventiviLavorazioneFocusHref(lavorazioneId: string, origine: PreventivoLavorazioneOrigine): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_LAV_ROW, lavorazioneId);
  sp.set(Q_FOCUS_LAV_TARGET, origine);
  return `/lavorazioni?${sp.toString()}`;
}

/** Link all'archivio Preventivi filtrato per lavorazione. */
export function buildPreventiviArchivioFilterHref(lavorazioneId: string, origine: PreventivoLavorazioneOrigine): string {
  const sp = new URLSearchParams();
  sp.set(Q_PREVENTIVI_LAV, lavorazioneId);
  sp.set(Q_PREVENTIVI_LAV_ORIG, origine);
  return `/preventivi?${sp.toString()}`;
}
