export type StatoLavorazione = "in_corso" | "sospesa" | "completata";
export type Priorita = "bassa" | "media" | "alta" | "critica";

export interface Lavorazione {
  id: string;
  macchina: string;
  targa: string;
  matricola: string;
  cliente: string;
  stato: StatoLavorazione;
  priorita: Priorita;
  addetto: string;
  dataEntrata: string;
  dataFine: string | null;
}

export interface ProdottoMagazzino {
  id: string;
  nome: string;
  codice: string;
  quantita: number;
  categoria: string;
}

export type StockLevel = "basso" | "ok" | "alto";

export interface PreventivoRiga {
  id: string;
  descrizione: string;
  qty: number;
  prezzoUnitario: number;
}

export interface Preventivo {
  id: string;
  numero: string;
  cliente: string;
  righe: PreventivoRiga[];
  data: string;
}

export interface Consuntivo {
  id: string;
  lavorazioneId: string;
  cliente: string;
  oreLavoro: number;
  materiali: { nome: string; importo: number }[];
}

export interface DDT {
  id: string;
  numero: string;
  destinatario: string;
  causale: string;
  data: string;
}

export interface OrdineFornitore {
  id: string;
  numero: string;
  fornitore: string;
  stato: "bozza" | "inviato" | "ricevuto";
  totale: number;
  data: string;
}

export interface AziendaCliente {
  id: string;
  ragioneSociale: string;
  piva: string;
  citta: string;
}

export interface Fornitore {
  id: string;
  ragioneSociale: string;
  citta: string;
}

export interface MacchinaAnagrafica {
  id: string;
  modello: string;
  targa: string;
  cliente: string;
}

/** Estensione documenti — campi legacy opzionali per compatibilità lettura. */
export type DocumentoTipoFile = "pdf" | "immagine" | "excel" | "word" | "testo" | "altro";

/** Riferimento legacy a coppia marca / “macchina” (= modello nel catalogo vecchio). */
export interface DocumentoAssocRef {
  marcaId: string;
  macchinaId: string;
}

/** Dove vale il documento (gerarchia: marca → modello → mezzo). */
export type DocumentoApplicabilita = "marca" | "modello" | "macchina";

export interface DocumentoGestionale {
  id: string;
  nome: string;
  categoria: "manuali" | "listini" | "cataloghi" | "altro";
  /** Denormalizzato: prima destinazione o etichetta principale (ordinamento, compatibilità). */
  marca: string;
  /** Legacy: nel catalogo precedente conteneva il nome modello, non il mezzo. */
  macchina: string;
  tipoFile: DocumentoTipoFile;
  autoreCaricamento: string;
  note?: string;
  ultimaModifica: string;
  caricatoIl: string;
  dimensioneKb: number;
  /**
   * Nuova applicabilità (preferita). Se assente si deduce da `categoria` + legacy `associazioni` / marca-macchina.
   */
  applicabilita?: DocumentoApplicabilita;
  /** Marca (testo, allineato a Impostazioni → Mezzi → Marche). */
  marcaKey?: string;
  /** Modello (testo, allineato a Impostazioni → Modelli). Obbligatorio se applicabilità modello o macchina. */
  modelloKey?: string;
  /** Id mezzo anagrafica (`MezzoGestito.id`) se applicabilità macchina. */
  mezzoId?: string;
  /** Destinazioni archivio legacy (multi‑modello). Se presente e `applicabilita` assente, viene migrato. */
  associazioni?: DocumentoAssocRef[];
  /** Se URL http(s), il nome file può aprire in nuova scheda. */
  urlDocumento?: string;
  /** Object URL (`blob:...`) da file caricato in sessione; revocare con `URL.revokeObjectURL` quando il documento viene eliminato. */
  urlBlob?: string;
  /** Estensione file, es. `.pdf` (opzionale, da upload o nome). */
  fileEstensione?: string;
  /** Legacy — non più usati in UI Documenti */
  entitaTipo?: "macchina" | "azienda" | "lavorazione";
  entitaLabel?: string;
}
