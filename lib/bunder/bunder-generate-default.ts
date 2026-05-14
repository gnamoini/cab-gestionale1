import { allocateNextNumero } from "@/lib/bunder/bunder-numbering";
import { bunderKindLabel } from "@/lib/bunder/doc-kind-meta";
import type { BunderCommercialDocument, BunderCondizioni, BunderDocKind, BunderProductRiga } from "@/lib/bunder/types";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";

function nextRigaId(): string {
  return `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nextDocId(): string {
  return `bnd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultCondizioni(): BunderCondizioni {
  return {
    iva: "Esclusa",
    resa: "Franco destino bordo camion",
    trasporto: "A ns. cura escluso scarico",
    assemblaggio: "A nostra cura per prodotti pronti all'uso",
    consegna: "Entro termini indicati nel presente documento",
    pagamento: "Secondo condizioni commerciali in uso tra le Parti",
    garanzia: "Di legge per quanto applicabile",
    validitaOfferta: "Salvo venduto e salvo disponibilità merceologica",
  };
}

export const DEFAULT_CLAUSOLE_LEGALI = `Le Parti convengono che eventuali ritardi nella consegna imputabili a cause di forza maggiore ovvero a indisponibilità temporanea di materie prime, a congestioni logistiche o a incrementi dei costi energetici non potranno essere considerati inadempimento contrattuale, ferma restando l'obbligo di informazione tempestiva.

Si precisa che i prezzi indicati potranno essere revisionati in caso di variazioni significative dei listini fornitori, delle quotazioni delle materie prime o dei costi di trasformazione, secondo quanto previsto dalla prassi commerciale di settore.

Qualsiasi ordine o conferma dovrà intendersi subordinata alla verifica tecnica della commessa e all'effettiva disponibilità dei materiali al momento dell'evasione.`;

export const DEFAULT_INTRO =
  "Facciamo seguito alla Vs. gradita richiesta per trasmettere la nostra migliore offerta relativamente ai prodotti sotto elencati, alle condizioni e modalità di seguito specificate.";

export const DEFAULT_CHIUSURA = "In attesa di Vs. gradito riscontro, porgiamo distinti saluti.";

export const DEFAULT_NOTA_FIRMA = "BUNDER Company srl\nIl Responsabile Commerciale";

function descrTecnicaRicambio(r: RicambioMagazzino): string {
  const base = r.descrizione.trim();
  const mat = ["acciaio zincato", "polietilene HDPE", "inox AISI 304", "ABS", "PVC", "alluminio"];
  const tech = ["verniciatura epossidica", "saldatura robotizzata", "stampaggio ad iniezione", "zincatura tropicalizzata"];
  const cert = ["UNI EN 840", "ISO 9001", "ISO 14001", "marcatura CE"];
  return `${base}. Costruzione con materiali selezionati (${mat[r.id.length % mat.length]}). Processo produttivo: ${tech[r.codiceFornitoreOriginale.length % tech.length]}. Certificazioni di riferimento: ${cert[r.marca.length % cert.length]}. Caratteristiche: resistenza meccanica elevata, idoneità all'impiego in ambiente urbano e compatibilità con sistemi automatizzati di raccolta.`;
}

export function righeSampleDaMagazzino(rics: RicambioMagazzino[], max = 4): BunderProductRiga[] {
  const slice = rics.slice(0, Math.min(max, Math.max(1, rics.length)));
  return slice.map((r) => {
    const qty = 1 + (r.id.length % 4);
    const pu = Math.max(0, r.prezzoVendita || 0);
    return {
      id: nextRigaId(),
      quantita: qty,
      codice: r.codiceFornitoreOriginale.trim() || r.id.slice(0, 12),
      nome: r.descrizione.trim().slice(0, 120) || "Articolo",
      descrizioneTecnica: descrTecnicaRicambio(r),
      prezzoUnitario: pu,
    };
  });
}

export function righeFromPreventivo(p: PreventivoRecord): BunderProductRiga[] {
  return p.righeRicambi.map((rr) => {
    const net = totaleNettoRigaRicambio(rr);
    const pu = rr.quantita > 0 ? net / rr.quantita : 0;
    return {
      id: nextRigaId(),
      quantita: rr.quantita,
      codice: rr.codiceOE.trim() || "—",
      nome: rr.descrizione.trim().slice(0, 160) || "Ricambio",
      descrizioneTecnica: `${rr.descrizione.trim()}. Fornitura secondo specifiche tecniche correlate all'intervento di manutenzione. Materiali e finiture conformi alle normative di settore.`,
      prezzoUnitario: Math.round(pu * 100) / 100,
    };
  });
}

function oggettoPerKind(kind: BunderDocKind, settore: string): string {
  const s = settore.trim() || "attrezzature ambientali e raccolta differenziata";
  const map: Record<BunderDocKind, string> = {
    offerta_commerciale: `Offerta fornitura componentistica per ${s}`,
    preventivo: `Preventivo fornitura ricambi e servizi — ${s}`,
    ordine_acquisto: `Ordine di acquisto materiali e semilavorati — ${s}`,
    conferma_ordine: `Conferma d'ordine e accettazione condizioni commerciali`,
    richiesta_offerta: `Richiesta offerta tecnico-commerciale — ${s}`,
    quotazione_tecnica: `Quotazione tecnica dettagliata — ${s}`,
    proposta_economica: `Proposta economica vincolata — ${s}`,
  };
  return map[kind];
}

export function totaleDocumento(d: BunderCommercialDocument): number {
  return d.righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0);
}

export function createNuovoBunderDocument(opts: {
  kind: BunderDocKind;
  autore: string;
  existing: BunderCommercialDocument[];
  magazzino?: RicambioMagazzino[];
  preventivo?: PreventivoRecord | null;
  clienteSeed?: { ragione: string; indirizzo: string; cap: string; citta: string; referente: string; settore: string };
}): BunderCommercialDocument {
  const now = new Date();
  const iso = now.toISOString();
  const dataDoc = iso.slice(0, 10);
  const righe =
    opts.preventivo && opts.preventivo.righeRicambi.length > 0
      ? righeFromPreventivo(opts.preventivo)
      : opts.magazzino && opts.magazzino.length > 0
        ? righeSampleDaMagazzino(opts.magazzino)
        : [
            {
              id: nextRigaId(),
              quantita: 2,
              codice: "CASS-HDPE-120",
              nome: "Cassonetto raccolta differenziata 120 l",
              descrizioneTecnica:
                "Cassonetto in polietilene HDPE ad alta densità, stampaggio ad iniezione, coperchio incernierato con guarnizione, ruote pivotanti Ø 200 mm, predisposizione serratura. Conformità UNI EN 840, marcatura CE. Verniciatura epossidica per massima resistenza UV e agenti atmosferici.",
              prezzoUnitario: 186.5,
            },
            {
              id: nextRigaId(),
              quantita: 1,
              codice: "ASS-ZN-90",
              nome: "Assale zincato per carrellatura industriale",
              descrizioneTecnica:
                "Assale in acciaio zincato tropicalizzato, saldatura robotizzata, portata nominale elevata. Trattamento superficiale per resistenza alla corrosione. Idoneo per impieghi gravosi in impianti di compattazione.",
              prezzoUnitario: 412.0,
            },
          ];
  const c = opts.clienteSeed;
  const azienda = c?.ragione?.trim() || opts.preventivo?.cliente?.trim() || "Spett.le Ditta — da completare";
  const indirizzo = c?.indirizzo?.trim() || "Via Industriale, 12";
  const cap = c?.cap?.trim() || "20090";
  const citta = c?.citta?.trim() || "Segrate (MI)";
  const referente = c?.referente?.trim() || "Ufficio Acquisti";
  const settore = c?.settore?.trim() || "impianti di trattamento rifiuti e logistica ambientale";

  return {
    id: nextDocId(),
    kind: opts.kind,
    numeroProgressivo: allocateNextNumero(opts.existing, opts.kind, now),
    dataDocumento: dataDoc,
    luogo: "Milano",
    aziendaDestinatario: azienda,
    indirizzo,
    cap,
    citta,
    referente,
    oggetto: oggettoPerKind(opts.kind, settore),
    settore,
    intro: DEFAULT_INTRO,
    righe,
    condizioni: defaultCondizioni(),
    clausoleLegali: DEFAULT_CLAUSOLE_LEGALI,
    chiusura: DEFAULT_CHIUSURA,
    noteFirma: DEFAULT_NOTA_FIRMA,
    riferimentoInterno: `BUND-${now.getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    createdBy: opts.autore.trim() || "Operatore",
    createdAt: iso,
    updatedAt: iso,
    lastEditedBy: opts.autore.trim() || "Operatore",
  };
}

export function cloneBunderDocument(
  source: BunderCommercialDocument,
  opts: {
    allDocs: BunderCommercialDocument[];
    autore: string;
    mode: "duplica" | "nuovo_da_modello";
    refreshPricesFrom?: RicambioMagazzino[];
    kind?: BunderDocKind;
  },
): BunderCommercialDocument {
  const now = new Date();
  const iso = now.toISOString();
  const kind = opts.kind ?? source.kind;
  const priceMap = new Map<string, RicambioMagazzino>();
  for (const r of opts.refreshPricesFrom ?? []) {
    const k = r.codiceFornitoreOriginale.trim().toLowerCase();
    if (k) priceMap.set(k, r);
  }
  const righe: BunderProductRiga[] = source.righe.map((row) => {
    let pu = row.prezzoUnitario;
    if (opts.mode === "nuovo_da_modello" && priceMap.size > 0) {
      const hit = priceMap.get(row.codice.trim().toLowerCase());
      if (hit && hit.prezzoVendita > 0) pu = hit.prezzoVendita;
    }
    return {
      ...row,
      id: nextRigaId(),
      prezzoUnitario: Math.round(pu * 100) / 100,
    };
  });
  return {
    ...source,
    id: nextDocId(),
    kind,
    numeroProgressivo: allocateNextNumero(opts.allDocs, kind, now),
    dataDocumento: iso.slice(0, 10),
    riferimentoInterno: `BUND-${now.getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    condizioni: {
      ...source.condizioni,
      validitaOfferta: defaultCondizioni().validitaOfferta,
    },
    righe,
    createdBy: opts.autore.trim() || "Operatore",
    createdAt: iso,
    updatedAt: iso,
    lastEditedBy: opts.autore.trim() || "Operatore",
  };
}

export function documentoMatchesSearch(d: BunderCommercialDocument, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const hay = [
    d.numeroProgressivo,
    bunderKindLabel(d.kind),
    d.aziendaDestinatario,
    d.referente,
    d.oggetto,
    d.settore,
    d.riferimentoInterno,
    d.createdBy,
    ...d.righe.flatMap((r) => [r.codice, r.nome, r.descrizioneTecnica]),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(t);
}
