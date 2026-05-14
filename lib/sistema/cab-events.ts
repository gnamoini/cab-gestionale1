/** Evento finestra: ricarica preferenze lavorazioni (anagrafiche) da localStorage senza navigazione. */
export const CAB_LAVORAZIONI_PREFS_REFRESH = "cab-lavorazioni-prefs-refresh";

/** Evento: ricarica anagrafiche magazzino (marche, categorie, …) da localStorage. */
export const CAB_MAGAZZINO_MASTER_REFRESH = "cab-magazzino-master-refresh";

/** Evento: ricarica elenchi mezzi (clienti, marche, tipi, stati) da localStorage. */
export const CAB_MEZZI_LISTE_REFRESH = "cab-mezzi-liste-refresh";

export function dispatchLavorazioniPrefsRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_LAVORAZIONI_PREFS_REFRESH));
}

export function dispatchMagazzinoMasterRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_MAGAZZINO_MASTER_REFRESH));
}

export function dispatchMezziListeRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_MEZZI_LISTE_REFRESH));
}

/** Rinomina addetto su record lavorazioni (attive + storico) quando la vista è montata. */
export const CAB_ADDETTO_DISPLAY_RENAME = "cab-addetto-display-rename";

export type CabAddettoRenameDetail = { previousName: string; nextName: string };

export function dispatchAddettoDisplayRename(detail: CabAddettoRenameDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CabAddettoRenameDetail>(CAB_ADDETTO_DISPLAY_RENAME, { detail }));
}

/** Log modifiche dashboard (impostazioni + cose da fare): aggiorna pannello se aperto. */
export const CAB_DASHBOARD_SISTEMA_LOG_REFRESH = "cab-dashboard-sistema-log-refresh";

export function dispatchDashboardSistemaLogRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_DASHBOARD_SISTEMA_LOG_REFRESH));
}

export const CAB_PREVENTIVI_REFRESH = "cab-preventivi-refresh";

export function dispatchPreventiviRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_PREVENTIVI_REFRESH));
}

export const CAB_PREVENTIVI_LOG_REFRESH = "cab-preventivi-log-refresh";

export function dispatchPreventiviLogRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_PREVENTIVI_LOG_REFRESH));
}

export const CAB_DOCUMENTI_LOG_REFRESH = "cab-documenti-log-refresh";

export function dispatchDocumentiLogRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_DOCUMENTI_LOG_REFRESH));
}

export const CAB_BUNDER_LOG_REFRESH = "cab-bunder-log-refresh";

export function dispatchBunderLogRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAB_BUNDER_LOG_REFRESH));
}
