/** Tipi allineati allo schema PostgreSQL / Supabase (snake_case). */

export type RuoloProfile = "admin" | "tecnico" | "viewer";

export type ProfileRow = {
  id: string;
  nome: string;
  ruolo: RuoloProfile;
  created_at: string;
  updated_at: string;
};

export type StatoLavorazione =
  | "bozza"
  | "in_coda"
  | "in_officina"
  | "in_attesa_ricambi"
  | "completata"
  | "consegnata"
  | "annullata";

export type PrioritaLavorazione = "bassa" | "media" | "alta" | "urgente";

export type TipoSchedaLavorazione = "ingresso" | "intervento" | "ricambi";

export type TipoMovimentoRicambio = "entrata" | "uscita";

export type CategoriaDocumento = "listino" | "manuale" | "catalogo" | "altro";

export type MezzoRow = {
  id: string;
  cliente: string;
  utilizzatore: string | null;
  marca: string;
  modello: string;
  targa: string | null;
  matricola: string;
  numero_scuderia: string | null;
  anno: number | null;
  created_at: string;
  updated_at: string;
};

export type LavorazioneRow = {
  id: string;
  mezzo_id: string;
  stato: StatoLavorazione;
  priorita: PrioritaLavorazione;
  data_ingresso: string | null;
  data_uscita: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Tabella `scheda_lavorazione` (schede di lavorazione). */
export type SchedaLavorazioneRow = {
  id: string;
  lavorazione_id: string;
  tipo: TipoSchedaLavorazione;
  contenuto: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MagazzinoRicambioRow = {
  id: string;
  codice: string;
  nome: string;
  marca: string | null;
  quantita: number;
  costo: number | null;
  prezzo_vendita: number | null;
  consumo_medio_mensile: number | null;
  created_at: string;
  updated_at: string;
};

export type MovimentoRicambioRow = {
  id: string;
  ricambio_id: string;
  lavorazione_id: string | null;
  tipo: TipoMovimentoRicambio;
  quantita: number;
  created_at: string;
};

export type PreventivoRow = {
  id: string;
  mezzo_id: string;
  lavorazione_id: string | null;
  cliente: string;
  totale: number;
  dettagli: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DocumentoRow = {
  id: string;
  mezzo_id: string | null;
  marca: string;
  modello: string | null;
  categoria: CategoriaDocumento;
  url_file: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export type LogModificaRow = {
  id: string;
  entita: string;
  entita_id: string;
  azione: string;
  autore_id: string | null;
  payload: unknown;
  created_at: string;
};
