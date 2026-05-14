import { BUNDER_DOCUMENTS_MAX, BUNDER_DOCUMENTS_STORAGE_KEY } from "@/lib/bunder/constants";
import { createNuovoBunderDocument } from "@/lib/bunder/bunder-generate-default";
import type { BunderCommercialDocument, BunderCondizioni, BunderDocKind, BunderProductRiga } from "@/lib/bunder/types";

function hydrateDoc(raw: unknown): BunderCommercialDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id ? o.id : null;
  if (!id) return null;
  const kind = o.kind as BunderDocKind;
  const kinds: BunderDocKind[] = [
    "offerta_commerciale",
    "preventivo",
    "ordine_acquisto",
    "conferma_ordine",
    "richiesta_offerta",
    "quotazione_tecnica",
    "proposta_economica",
  ];
  const k = kinds.includes(kind) ? kind : "offerta_commerciale";
  const righeIn = Array.isArray(o.righe) ? o.righe : [];
  const righe: BunderProductRiga[] = righeIn
    .map((x: unknown) => {
      const r = x as Record<string, unknown>;
      return {
        id: typeof r.id === "string" && r.id ? r.id : `br-${Math.random().toString(36).slice(2, 9)}`,
        quantita: Math.max(0.001, Number(r.quantita) || 1),
        codice: String(r.codice ?? ""),
        nome: String(r.nome ?? ""),
        descrizioneTecnica: String(r.descrizioneTecnica ?? ""),
        prezzoUnitario: Math.max(0, Number(r.prezzoUnitario) || 0),
      };
    })
    .filter((r) => r.nome.trim().length > 0 || r.codice.trim().length > 0);
  const c = (o.condizioni as Record<string, unknown>) || {};
  const condizioni: BunderCondizioni = {
    iva: String(c.iva ?? "Esclusa"),
    resa: String(c.resa ?? ""),
    trasporto: String(c.trasporto ?? ""),
    assemblaggio: String(c.assemblaggio ?? ""),
    consegna: String(c.consegna ?? ""),
    pagamento: String(c.pagamento ?? ""),
    garanzia: String(c.garanzia ?? ""),
    validitaOfferta: String(c.validitaOfferta ?? ""),
  };
  return {
    id,
    kind: k,
    numeroProgressivo: String(o.numeroProgressivo ?? ""),
    dataDocumento: String(o.dataDocumento ?? new Date().toISOString().slice(0, 10)),
    luogo: String(o.luogo ?? "Milano"),
    aziendaDestinatario: String(o.aziendaDestinatario ?? ""),
    indirizzo: String(o.indirizzo ?? ""),
    cap: String(o.cap ?? ""),
    citta: String(o.citta ?? ""),
    referente: String(o.referente ?? ""),
    oggetto: String(o.oggetto ?? ""),
    settore: String(o.settore ?? ""),
    intro: String(o.intro ?? ""),
    righe: righe.length ? righe : [],
    condizioni,
    clausoleLegali: String(o.clausoleLegali ?? ""),
    chiusura: String(o.chiusura ?? ""),
    noteFirma: String(o.noteFirma ?? ""),
    riferimentoInterno: String(o.riferimentoInterno ?? ""),
    createdBy: String(o.createdBy ?? "Sistema"),
    createdAt: String(o.createdAt ?? new Date().toISOString()),
    updatedAt: String(o.updatedAt ?? new Date().toISOString()),
    lastEditedBy: String(o.lastEditedBy ?? ""),
  };
}

export function loadBunderDocuments(): BunderCommercialDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BUNDER_DOCUMENTS_STORAGE_KEY);
    if (!raw) return seedBunderDocuments();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return seedBunderDocuments();
    const out: BunderCommercialDocument[] = [];
    for (const x of parsed) {
      const d = hydrateDoc(x);
      if (d) out.push(d);
    }
    return out.length ? out.slice(0, BUNDER_DOCUMENTS_MAX) : seedBunderDocuments();
  } catch {
    return seedBunderDocuments();
  }
}

function seedBunderDocuments(): BunderCommercialDocument[] {
  const a = createNuovoBunderDocument({
    kind: "offerta_commerciale",
    autore: "Sistema",
    existing: [],
    clienteSeed: {
      ragione: "EcoLogica SpA",
      indirizzo: "Via delle Betulle, 45",
      cap: "40128",
      citta: "Bologna",
      referente: "Ing. Paolo Marchetti",
      settore: "contenitori raccolta differenziata e logistica urbana",
    },
  });
  const b = createNuovoBunderDocument({
    kind: "richiesta_offerta",
    autore: "Sistema",
    existing: [a],
    clienteSeed: {
      ragione: "GreenWaste srl",
      indirizzo: "Zona Industriale Lotto 7",
      cap: "20081",
      citta: "Abbiategrasso (MI)",
      referente: "Sig.ra Laura Bianchi",
      settore: "ricambi per compattatori e sistemi di pressatura",
    },
  });
  return [b, a];
}

export function saveBunderDocuments(docs: BunderCommercialDocument[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BUNDER_DOCUMENTS_STORAGE_KEY, JSON.stringify(docs.slice(0, BUNDER_DOCUMENTS_MAX)));
  } catch {
    /* ignore */
  }
}
