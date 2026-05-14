import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { SchedaIngressoFields } from "@/types/schede";

/** Campi ordinati per intestazioni professionali (solo valori presenti in output). */
export type MezzoIdentificazioneParts = {
  targa?: string;
  matricola?: string;
  nScuderia?: string;
  marcaAttrezzatura?: string;
  modelloAttrezzatura?: string;
  cliente?: string;
  cantiere?: string;
  utilizzatore?: string;
};

const ORDER: { key: keyof MezzoIdentificazioneParts; label: string }[] = [
  { key: "targa", label: "Targa" },
  { key: "matricola", label: "Matricola" },
  { key: "nScuderia", label: "Scuderia" },
  { key: "marcaAttrezzatura", label: "Marca attrezzatura" },
  { key: "modelloAttrezzatura", label: "Modello" },
  { key: "cliente", label: "Cliente" },
  { key: "cantiere", label: "Cantiere" },
  { key: "utilizzatore", label: "Utilizzatore" },
];

function clean(s: string | undefined | null): string | undefined {
  const t = String(s ?? "").trim();
  return t.length > 0 ? t : undefined;
}

/** Es. `Targa: AB123CD • Matricola: MX…` — solo campi valorizzati. */
export function formatIdentificazioneMezzoLine(parts: MezzoIdentificazioneParts): string {
  const segments: string[] = [];
  for (const { key, label } of ORDER) {
    const v = clean(parts[key] as string | undefined);
    if (v) segments.push(`${label}: ${v}`);
  }
  return segments.join(" • ");
}

export function identificazionePartsFromLavorazione(
  lav: LavorazioneAttiva | LavorazioneArchiviata,
  mezzo: MezzoGestito | null,
): MezzoIdentificazioneParts {
  const targa = clean(lav.targa);
  const matricola = clean(lav.matricola);
  const nScuderia = clean(lav.nScuderia) ?? clean(mezzo?.numeroScuderia);
  const marcaM = clean(mezzo?.marca);
  const modelloM = clean(mezzo?.modello);
  const macchinaLav = clean(lav.macchina);
  let marcaAttrezzatura = marcaM;
  let modelloAttrezzatura = modelloM;
  if (!marcaAttrezzatura && !modelloAttrezzatura && macchinaLav) {
    modelloAttrezzatura = macchinaLav;
  } else if (marcaAttrezzatura && !modelloAttrezzatura && macchinaLav && !mezzo) {
    modelloAttrezzatura = macchinaLav;
  }
  return {
    targa,
    matricola,
    nScuderia,
    marcaAttrezzatura,
    modelloAttrezzatura,
    cliente: clean(lav.cliente),
    cantiere: undefined,
    utilizzatore: clean(lav.utilizzatore),
  };
}

export function identificazionePartsFromSchedaIngresso(f: SchedaIngressoFields): MezzoIdentificazioneParts {
  return {
    targa: clean(f.targa),
    matricola: clean(f.matricola),
    nScuderia: clean(f.nScuderia),
    marcaAttrezzatura: clean(f.marcaAttrezzatura),
    modelloAttrezzatura: clean(f.modelloAttrezzatura),
    cliente: clean(f.cliente),
    cantiere: clean(f.cantiere),
    utilizzatore: clean(f.utilizzatore),
  };
}

/** Ricerca su anagrafica mezzi (targa, matricola, scuderia, cliente, marca, modello, utilizzatore, tipo). */
export function mezzoMatchesSmartQuery(mezzo: MezzoGestito, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    mezzo.targa,
    mezzo.matricola,
    mezzo.numeroScuderia,
    mezzo.cliente,
    mezzo.marca,
    mezzo.modello,
    mezzo.utilizzatore,
    mezzo.tipoAttrezzatura,
    `${mezzo.marca} ${mezzo.modello}`,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q) || q.split(/\s+/).every((w) => w.length > 0 && hay.includes(w));
}
