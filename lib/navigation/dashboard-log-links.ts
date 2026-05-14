import type { LavorazioniLogEntry } from "@/lib/lavorazioni/lavorazioni-change-log";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";

/** Query: focus riga lavorazioni (attiva o storico). */
export const Q_FOCUS_LAV_ROW = "focusLav";
export const Q_FOCUS_LAV_TARGET = "focusLavTarget";
/** Titolo log (fallback match storico se id cambiato). */
export const Q_FOCUS_LAV_TITOLO = "focusLavTitolo";

/** Query: focus ricambio in tabella magazzino. */
export const Q_FOCUS_RICAMBIO = "focusRicambio";

/** Query: evidenzia lavorazioni collegate a un mezzo (anagrafica id). */
export const Q_FOCUS_MEZZO = "focusMezzo";

export function buildLavorazioniLogFocusHref(entry: LavorazioniLogEntry): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_LAV_ROW, entry.recordId);
  sp.set(Q_FOCUS_LAV_TARGET, entry.target);
  const t = entry.titolo.trim();
  if (t) sp.set(Q_FOCUS_LAV_TITOLO, t);
  return `/lavorazioni?${sp.toString()}`;
}

export function buildMagazzinoLogFocusHref(entry: MagazzinoChangeLogEntry): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_RICAMBIO, entry.ricambioId);
  return `/magazzino?${sp.toString()}`;
}
