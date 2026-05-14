/** Data di riferimento demo (coerente con mock) — non usare new Date() in render. */
export const MEZZI_OGGI_DEMO = "2026-05-11";

export type MezzoPriorita = "normale" | "media" | "alta";

/** Opzionale: collegamento esplicito a riga lavorazione (id). */
export type MezzoGestito = {
  id: string;
  /** Se valorizzato, match prioritario con `LavorazioneAttiva.id` / `LavorazioneArchiviata.id` */
  lavorazioneMezzoId?: string;
  cliente: string;
  utilizzatore: string;
  marca: string;
  modello: string;
  targa: string;
  matricola: string;
  /** N. scuderia / postazione flotta (opzionale, usato in ricerca e identificazione). */
  numeroScuderia?: string;
  tipoAttrezzatura: string;
  anno: number;
  oreKm: number;
  statoAttuale: string;
  dataUltimaUscita: string;
  note: string;
  priorita: MezzoPriorita;
  /**
   * Se true: riga costruita automaticamente da lavorazione / preventivo / documento
   * perché non esiste ancora un record corrispondente in anagrafica mezzi.
   */
  hubSynthetic?: boolean;
};

export type MezziSortKey = "cliente" | "marca" | "targa" | "matricola";

export type MezziSortPhase = "natural" | "asc" | "desc";

/** Riga sintetica da dati Lavorazioni (attive + storico). */
export type MezzoInterventoLavorazione = {
  id: string;
  origine: "storico" | "attiva";
  dataIngresso: string;
  dataCompletamento: string | null;
  durataGiorniLabel: string;
  durataGiorniNum: number;
  tipoIntervento: string;
  descrizione: string;
  prioritaLabel: string;
  statoFinale: string;
};
