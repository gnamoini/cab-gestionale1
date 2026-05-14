export interface RicambioMagazzino {
  id: string;
  marca: string;
  codiceFornitoreOriginale: string;
  descrizione: string;
  note: string;
  categoria: string;
  compatibilitaMezzi: string[];
  scorta: number;
  scortaMinima: number;
  dataUltimaModifica: string;
  autoreUltimaModifica: string;
  prezzoFornitoreOriginale: number;
  scontoFornitoreOriginale: number;
  /** Markup % sul listino OE: vendita = listino + listino × markup/100 */
  markupPercentuale: number;
  prezzoVendita: number;
  fornitoreNonOriginale: string;
  codiceFornitoreNonOriginale: string;
  prezzoFornitoreNonOriginale: number;
  scontoFornitoreNonOriginale: number;
}

export type SortKeyMagazzino =
  | "marca"
  | "codiceFornitoreOriginale"
  | "categoria"
  | "scorta"
  | "prezzoVendita"
  | "consumoMedioMensile";
