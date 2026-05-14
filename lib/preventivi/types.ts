export type PreventivoStato = "bozza" | "inviato" | "approvato" | "rifiutato" | "convertito";

export type PreventivoLavorazioneOrigine = "attiva" | "storico";

export type PreventivoRigaRicambio = {
  id: string;
  ricambioId: string | null;
  codiceOE: string;
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  /** Sconto percentuale sulla riga (0–100). */
  scontoPercent: number;
};

export type PreventivoManodopera = {
  oreTotali: number;
  righeAddetti: { addetto: string; ore: number }[];
  costoOrario: number;
  /** Sconto percentuale sulla manodopera (0–100). */
  scontoPercent: number;
};

export type PreventivoRecord = {
  id: string;
  numero: string;
  dataCreazione: string;
  aggiornatoAt: string;
  stato: PreventivoStato;
  lavorazioneId: string;
  lavorazioneOrigine: PreventivoLavorazioneOrigine;
  cliente: string;
  cantiere: string;
  utilizzatore: string;
  macchinaRiassunto: string;
  targa: string;
  matricola: string;
  nScuderia: string;
  marcaAttrezzatura: string;
  modelloAttrezzatura: string;
  descrizioneLavorazioniCliente: string;
  /** Testo tecnico aggregato usato in generazione (per apprendimento). */
  descrizioneLavorazioniTecnicaSorgente: string;
  /** Prima bozza cliente-friendly generata automaticamente. */
  descrizioneGenerataAuto: string;
  righeRicambi: PreventivoRigaRicambio[];
  manodopera: PreventivoManodopera;
  noteFinali: string;
  totaleRicambi: number;
  totaleManodopera: number;
  totaleFinale: number;
  createdBy: string;
  lastEditedBy: string;
};

export type PreventivoSortKey =
  | "numero"
  | "dataCreazione"
  | "cliente"
  | "macchinaRiassunto"
  | "targa"
  | "matricola"
  | "nScuderia"
  | "totaleFinale"
  | "lavorazioneId";

export type PreventivoSortPhase = "natural" | "asc" | "desc";
