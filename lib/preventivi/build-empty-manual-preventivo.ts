import { inferEconomiciClientePreventivi } from "@/lib/preventivi/preventivi-cliente-infer";
import { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
import { loadPreventivi, nextPreventivoId, nextPreventivoNumero } from "@/lib/preventivi/preventivi-storage";
import type { PreventivoRecord } from "@/lib/preventivi/types";

/** Bozza vuota senza lavorazione collegata (salvataggio alla prima conferma in modale). */
export function buildEmptyManualPreventivo(autore: string): PreventivoRecord {
  const tutti = loadPreventivi();
  const infer = inferEconomiciClientePreventivi("", tutti);
  const now = new Date().toISOString();
  const draft: PreventivoRecord = {
    id: nextPreventivoId(),
    numero: nextPreventivoNumero(tutti),
    dataCreazione: now,
    aggiornatoAt: now,
    stato: "bozza",
    lavorazioneId: "",
    lavorazioneOrigine: "attiva",
    cliente: "",
    cantiere: "",
    utilizzatore: "",
    macchinaRiassunto: "",
    targa: "",
    matricola: "",
    nScuderia: "",
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
    descrizioneLavorazioniCliente: "",
    descrizioneLavorazioniTecnicaSorgente: "",
    descrizioneGenerataAuto: "",
    righeRicambi: [],
    manodopera: {
      oreTotali: 1,
      righeAddetti: [{ addetto: "Officina", ore: 1 }],
      costoOrario: infer.costoOrario,
      scontoPercent: infer.manodoperaScontoPercent,
    },
    noteFinali: infer.noteFinaliTipiche,
    totaleRicambi: 0,
    totaleManodopera: 0,
    totaleFinale: 0,
    createdBy: autore,
    lastEditedBy: autore,
  };
  return { ...draft, ...calcolaTotaliPreventivo(draft) };
}
