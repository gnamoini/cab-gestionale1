import type { LavorazioniLogChange } from "@/lib/lavorazioni/lavorazioni-change-log";
import type {
  SchedaIngressoFields,
  SchedaLavorazioniDoc,
  SchedaRicambiDoc,
} from "@/types/schede";

export const SCHEDA_INGRESSO_LABEL = "Scheda Ingresso";
export const SCHEDA_LAVORAZIONI_LABEL = "Scheda Lavorazioni";
export const SCHEDA_RICAMBI_LABEL = "Scheda Ricambi";

const INGRESSO_LABELS: Record<keyof SchedaIngressoFields, string> = {
  dataIngresso: "Data ingresso",
  cliente: "Cliente",
  cantiere: "Cantiere",
  utilizzatore: "Utilizzatore",
  tipoAttrezzatura: "Tipo attrezzatura",
  marcaAttrezzatura: "Marca attrezzatura",
  modelloAttrezzatura: "Modello attrezzatura",
  matricola: "Matricola",
  nScuderia: "N. scuderia",
  oreLavoro: "Ore lavoro",
  tipoTelaio: "Tipo telaio",
  marcaTelaio: "Marca telaio",
  modelloTelaio: "Modello telaio",
  targa: "Targa",
  km: "KM",
  descrizioneAnomalia: "Descrizione anomalia",
  livelloCarburante: "Livello carburante",
  addettoAccettazione: "Addetto accettazione",
};

export function diffSchedaIngressoCampi(
  prima: SchedaIngressoFields,
  dopo: SchedaIngressoFields,
): LavorazioniLogChange[] {
  const out: LavorazioniLogChange[] = [];
  (Object.keys(INGRESSO_LABELS) as (keyof SchedaIngressoFields)[]).forEach((k) => {
    const a = prima[k] ?? "";
    const b = dopo[k] ?? "";
    if (a !== b) {
      out.push({ campo: INGRESSO_LABELS[k], prima: a || "—", dopo: b || "—" });
    }
  });
  return out;
}

function summarizeRigaLavorazione(r: {
  dataLavorazione: string;
  lavorazioniEffettuate: string;
  addettiAssegnati: { addetto: string; oreImpiegate: number }[];
}): string {
  const add = (r.addettiAssegnati ?? [])
    .map((x) => `${x.addetto || "—"} ${x.oreImpiegate}h`.trim())
    .join("; ");
  const lav = (r.lavorazioniEffettuate ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return `${r.dataLavorazione || "—"} · ${lav || "—"} · ${add || "—"}`;
}

export function diffSchedaLavorazioniDoc(
  prima: SchedaLavorazioniDoc | null,
  dopo: SchedaLavorazioniDoc,
): LavorazioniLogChange[] {
  const pseudoPrima: SchedaLavorazioniDoc =
    prima ??
    ({
      ...dopo,
      campi: { identificazioneMacchina: "", righe: [] },
    } as SchedaLavorazioniDoc);
  const out: LavorazioniLogChange[] = [];
  const a = pseudoPrima.campi;
  const b = dopo.campi;
  if (a.identificazioneMacchina !== b.identificazioneMacchina) {
    out.push({
      campo: "Identificazione macchina",
      prima: a.identificazioneMacchina || "—",
      dopo: b.identificazioneMacchina || "—",
    });
  }
  const max = Math.max(a.righe.length, b.righe.length);
  for (let i = 0; i < max; i += 1) {
    const ra = a.righe[i];
    const rb = b.righe[i];
    const sa = ra ? summarizeRigaLavorazione(ra) : "—";
    const sb = rb ? summarizeRigaLavorazione(rb) : "—";
    if (sa !== sb) {
      out.push({ campo: `Riga lavorazione ${i + 1}`, prima: sa, dopo: sb });
    }
  }
  return out;
}

function summarizeRigaRicambio(r: {
  ricambioNome: string;
  codice: string;
  quantita: number;
  addetto: string;
  dataUtilizzo: string;
  scaricoMagazzinoApplicato?: boolean;
}): string {
  const sc = r.scaricoMagazzinoApplicato ? " · scaricato" : "";
  return `${r.ricambioNome || "—"} (${r.codice || "—"}) ×${r.quantita} · ${r.addetto || "—"} · ${r.dataUtilizzo || "—"}${sc}`;
}

export function diffSchedaRicambiDoc(
  prima: SchedaRicambiDoc | null,
  dopo: SchedaRicambiDoc,
): LavorazioniLogChange[] {
  const pseudoPrima: SchedaRicambiDoc =
    prima ??
    ({
      ...dopo,
      campi: { identificazioneMacchina: "", righe: [] },
    } as SchedaRicambiDoc);
  const out: LavorazioniLogChange[] = [];
  const a = pseudoPrima.campi;
  const b = dopo.campi;
  if (a.identificazioneMacchina !== b.identificazioneMacchina) {
    out.push({
      campo: "Identificazione macchina",
      prima: a.identificazioneMacchina || "—",
      dopo: b.identificazioneMacchina || "—",
    });
  }
  const max = Math.max(a.righe.length, b.righe.length);
  for (let i = 0; i < max; i += 1) {
    const ra = a.righe[i];
    const rb = b.righe[i];
    const sa = ra ? summarizeRigaRicambio(ra) : "—";
    const sb = rb ? summarizeRigaRicambio(rb) : "—";
    if (sa !== sb) {
      out.push({ campo: `Riga ricambio ${i + 1}`, prima: sa, dopo: sb });
    }
  }
  return out;
}
