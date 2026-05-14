/** Modulo Lavorazioni — tipi dedicati (non dipendono dal vecchio union StatoLavorazione). */

export type PrioritaLav = "alta" | "media" | "bassa";

export interface StatoLavorazioneConfig {
  id: string;
  label: string;
  /** Colore badge / pill (#rrggbb). Opzionale: se assente si usa il tema predefinito per id. */
  color?: string;
}

/** Record in tabella principale (non archiviato). */
export interface LavorazioneAttiva {
  id: string;
  macchina: string;
  targa: string;
  matricola: string;
  /** N. scuderia / postazione flotta (opzionale). */
  nScuderia: string;
  cliente: string;
  utilizzatore: string;
  /** Cantiere / commessa (opzionale). */
  cantiere: string;
  statoId: string;
  priorita: PrioritaLav;
  addetto: string;
  noteInterne: string;
  dataIngresso: string;
  /** Impostata quando si passa a stato Completata (o in fase di archiviazione). */
  dataCompletamento: string | null;
}

export interface LavorazioneArchiviata {
  id: string;
  macchina: string;
  targa: string;
  matricola: string;
  /** N. scuderia / postazione flotta (opzionale). */
  nScuderia: string;
  cliente: string;
  utilizzatore: string;
  cantiere: string;
  addetto: string;
  noteInterne: string;
  statoFinaleId: string;
  prioritaFinale: PrioritaLav;
  dataIngresso: string;
  dataCompletamento: string;
  meseCompletamento: string;
}

export type SortKeyLavorazione =
  | "macchina"
  | "cliente"
  | "note"
  | "stato"
  | "priorita"
  | "addetto";

export type SortPhaseLav = "asc" | "desc" | "natural";

export type SortKeyStorico =
  | "macchina"
  | "mezzoIdent"
  | "cliente"
  | "addetto"
  | "dataIngresso"
  | "dataCompletamento"
  | "oreTotali";
