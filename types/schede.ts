/** Schede lavorazione — fascicolo digitale per intervento (ingresso, lavori, ricambi). */

export type SchedaTipo = "ingresso" | "lavorazioni" | "ricambi";

export type SchedaSorgente = "generata" | "file_esterno";

/** Badge UX (derivato anche in UI da sorgente / date). */
export type SchedaStatoUi = "mancante" | "creata" | "caricata" | "aggiornata";

export type SchedaFileEsterno = {
  fileName: string;
  mime: string;
  /** Base64 senza prefisso data: */
  dataBase64: string;
};

export type SchedaMeta = {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  tipo: SchedaTipo;
  sorgente: SchedaSorgente;
  /** Se caricato PDF/immagine da esterno. */
  fileEsterno: SchedaFileEsterno | null;
};

/** SCHEDA INGRESSO — campi officina. */
export type SchedaIngressoFields = {
  dataIngresso: string;
  cliente: string;
  cantiere: string;
  utilizzatore: string;
  tipoAttrezzatura: string;
  marcaAttrezzatura: string;
  modelloAttrezzatura: string;
  matricola: string;
  nScuderia: string;
  oreLavoro: string;
  tipoTelaio: string;
  marcaTelaio: string;
  modelloTelaio: string;
  targa: string;
  km: string;
  descrizioneAnomalia: string;
  livelloCarburante: string;
  addettoAccettazione: string;
};

export type SchedaIngressoDoc = SchedaMeta & {
  tipo: "ingresso";
  campi: SchedaIngressoFields;
};

/** Ore per singolo addetto su una riga lavorazione (multi-assegnazione). */
export type RigaAddettoOreScheda = {
  addetto: string;
  oreImpiegate: number;
};

export type RigaLavorazioneScheda = {
  id: string;
  dataLavorazione: string;
  lavorazioniEffettuate: string;
  addettiAssegnati: RigaAddettoOreScheda[];
};

export type SchedaLavorazioniFields = {
  identificazioneMacchina: string;
  righe: RigaLavorazioneScheda[];
};

export type SchedaLavorazioniDoc = SchedaMeta & {
  tipo: "lavorazioni";
  campi: SchedaLavorazioniFields;
};

export type RigaRicambioScheda = {
  id: string;
  ricambioId: string | null;
  ricambioNome: string;
  codice: string;
  quantita: number;
  addetto: string;
  dataUtilizzo: string;
  /** Se è stato applicato scarico magazzino da questa riga. */
  scaricoMagazzinoApplicato?: boolean;
};

export type SchedaRicambiFields = {
  identificazioneMacchina: string;
  righe: RigaRicambioScheda[];
};

export type SchedaRicambiDoc = SchedaMeta & {
  tipo: "ricambi";
  campi: SchedaRicambiFields;
};

export type LavorazioneSchedeBundle = {
  lavorazioneId: string;
  ingresso: SchedaIngressoDoc | null;
  lavorazioni: SchedaLavorazioniDoc | null;
  ricambi: SchedaRicambiDoc | null;
};

export type LavorazioneSchedeStore = Record<string, LavorazioneSchedeBundle>;
