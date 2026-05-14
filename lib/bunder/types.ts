export type BunderDocKind =
  | "offerta_commerciale"
  | "preventivo"
  | "ordine_acquisto"
  | "conferma_ordine"
  | "richiesta_offerta"
  | "quotazione_tecnica"
  | "proposta_economica";

export type BunderProductRiga = {
  id: string;
  quantita: number;
  codice: string;
  nome: string;
  descrizioneTecnica: string;
  prezzoUnitario: number;
};

export type BunderCondizioni = {
  iva: string;
  resa: string;
  trasporto: string;
  assemblaggio: string;
  consegna: string;
  pagamento: string;
  garanzia: string;
  validitaOfferta: string;
};

export type BunderCommercialDocument = {
  id: string;
  kind: BunderDocKind;
  /** Es. OFV26/0324 */
  numeroProgressivo: string;
  dataDocumento: string;
  luogo: string;
  aziendaDestinatario: string;
  indirizzo: string;
  cap: string;
  citta: string;
  referente: string;
  oggetto: string;
  settore: string;
  intro: string;
  righe: BunderProductRiga[];
  condizioni: BunderCondizioni;
  clausoleLegali: string;
  chiusura: string;
  noteFirma: string;
  riferimentoInterno: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastEditedBy: string;
};
