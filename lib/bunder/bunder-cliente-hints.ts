import type { BunderCommercialDocument } from "@/lib/bunder/types";

export type BunderClienteHint = {
  indirizzo: string;
  cap: string;
  citta: string;
  referente: string;
  pagamento: string;
  consegna: string;
  validitaOfferta: string;
  atIso: string;
};

function keyAzienda(s: string): string {
  return s.trim().toLowerCase();
}

/** Ultimo documento per stessa ragione sociale vince. */
export function hintsByCliente(docs: BunderCommercialDocument[]): Map<string, BunderClienteHint> {
  const m = new Map<string, BunderClienteHint>();
  const sorted = [...docs].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  for (const d of sorted) {
    const k = keyAzienda(d.aziendaDestinatario);
    if (!k) continue;
    m.set(k, {
      indirizzo: d.indirizzo,
      cap: d.cap,
      citta: d.citta,
      referente: d.referente,
      pagamento: d.condizioni.pagamento,
      consegna: d.condizioni.consegna,
      validitaOfferta: d.condizioni.validitaOfferta,
      atIso: d.updatedAt,
    });
  }
  return m;
}

export function applicaHintCliente(doc: BunderCommercialDocument, hint: BunderClienteHint | undefined): BunderCommercialDocument {
  if (!hint) return doc;
  return {
    ...doc,
    indirizzo: hint.indirizzo || doc.indirizzo,
    cap: hint.cap || doc.cap,
    citta: hint.citta || doc.citta,
    referente: hint.referente || doc.referente,
    condizioni: {
      ...doc.condizioni,
      pagamento: hint.pagamento || doc.condizioni.pagamento,
      consegna: hint.consegna || doc.condizioni.consegna,
      validitaOfferta: hint.validitaOfferta || doc.condizioni.validitaOfferta,
    },
  };
}
