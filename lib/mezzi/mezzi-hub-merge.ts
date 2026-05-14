import { resolveDocumentoApplicazione } from "@/lib/documenti/documenti-applicabilita";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { lavorazioneMatchesMezzo } from "@/lib/mezzi/lavorazioni-sync";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { DocumentoGestionale } from "@/lib/types/gestionale";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitMarcaModello(macchina: string): { marca: string; modello: string } {
  const t = macchina.trim();
  if (!t) return { marca: "—", modello: "—" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { marca: parts[0]!, modello: "—" };
  return { marca: parts[0]!, modello: parts.slice(1).join(" ") };
}

function lavSynthKey(lav: LavorazioneAttiva | LavorazioneArchiviata): string {
  const nt = norm(lav.targa);
  if (nt && nt !== "—") return `t:${nt}`;
  const nm = norm(lav.matricola);
  if (nm && nm !== "—") return `m:${nm}`;
  return `id:${lav.id}`;
}

function mezzoFromLavorazione(lav: LavorazioneAttiva | LavorazioneArchiviata): MezzoGestito {
  const { marca, modello } = splitMarcaModello(lav.macchina);
  const ing = lav.dataIngresso.slice(0, 10);
  return {
    id: `hub-lav-${lav.id}`,
    lavorazioneMezzoId: lav.id,
    cliente: lav.cliente,
    utilizzatore: lav.utilizzatore,
    marca,
    modello,
    targa: lav.targa?.trim() || "—",
    matricola: lav.matricola?.trim() || "—",
    numeroScuderia: lav.nScuderia?.trim() || undefined,
    tipoAttrezzatura: "—",
    anno: 0,
    oreKm: 0,
    statoAttuale: "Solo lavorazioni",
    dataUltimaUscita: ing,
    note: `Collegato a lavorazione ${lav.id}. Completa l'anagrafica mezzi per unificare il parco.`,
    priorita: "normale",
    hubSynthetic: true,
  };
}

function fakeLavFromPreventivo(pv: PreventivoRecord): LavorazioneAttiva {
  const mac =
    pv.macchinaRiassunto?.trim() ||
    `${pv.marcaAttrezzatura ?? ""} ${pv.modelloAttrezzatura ?? ""}`.trim() ||
    "—";
  return {
    id: pv.lavorazioneId,
    macchina: mac,
    targa: pv.targa ?? "",
    matricola: pv.matricola ?? "",
    nScuderia: pv.nScuderia ?? "",
    cliente: pv.cliente,
    utilizzatore: pv.utilizzatore,
    cantiere: pv.cantiere ?? "",
    statoId: "",
    priorita: "media",
    addetto: "",
    noteInterne: "",
    dataIngresso: pv.dataCreazione,
    dataCompletamento: null,
  };
}

export function preventivoMatchesMezzo(m: MezzoGestito, pv: PreventivoRecord): boolean {
  return lavorazioneMatchesMezzo(m, fakeLavFromPreventivo(pv));
}

export function documentoRelevantePerMezzo(doc: DocumentoGestionale, m: MezzoGestito): boolean {
  const r = resolveDocumentoApplicazione(doc);
  if (r.applicabilita === "macchina" && r.mezzoId === m.id) return true;
  const mar = norm(r.marcaKey ?? r.marca);
  const mod = norm(r.modelloKey ?? r.macchina);
  if (!mar || mar === "—") return false;
  if (norm(m.marca) !== mar) return false;
  if (r.applicabilita === "marca") return true;
  if (!mod || mod === "—") return false;
  return norm(m.modello) === mod;
}

function mezzoFromPreventivo(pv: PreventivoRecord): MezzoGestito {
  const fake = fakeLavFromPreventivo(pv);
  const { marca, modello } = splitMarcaModello(fake.macchina);
  const ing = pv.dataCreazione.slice(0, 10);
  return {
    id: `hub-pv-${pv.id}`,
    cliente: pv.cliente,
    utilizzatore: pv.utilizzatore,
    marca,
    modello,
    targa: pv.targa?.trim() || "—",
    matricola: pv.matricola?.trim() || "—",
    numeroScuderia: pv.nScuderia?.trim() || undefined,
    tipoAttrezzatura: "—",
    anno: 0,
    oreKm: 0,
    statoAttuale: "Solo preventivi",
    dataUltimaUscita: ing,
    note: `Collegato a preventivo ${pv.numero} (${pv.id}).`,
    priorita: "normale",
    hubSynthetic: true,
  };
}

function mezzoFromDocumento(doc: DocumentoGestionale): MezzoGestito | null {
  const r = resolveDocumentoApplicazione(doc);
  if (r.applicabilita !== "macchina" || !r.mezzoId?.trim()) return null;
  const ing = doc.caricatoIl.slice(0, 10);
  return {
    id: r.mezzoId.trim(),
    cliente: "—",
    utilizzatore: "—",
    marca: (r.marcaKey ?? r.marca).trim() || "—",
    modello: (r.modelloKey ?? r.macchina).trim() || "—",
    targa: "—",
    matricola: "—",
    tipoAttrezzatura: "—",
    anno: 0,
    oreKm: 0,
    statoAttuale: "Solo documenti",
    dataUltimaUscita: ing,
    note: `Documento collegato (${doc.nome}).`,
    priorita: "normale",
    hubSynthetic: true,
  };
}

/**
 * Unisce anagrafica mezzi con veicoli emersi solo da lavorazioni, preventivi o documenti (nessun duplicato se già coperto da match).
 */
export function mergeMezziHubRows(
  baseMezzi: MezzoGestito[],
  attive: LavorazioneAttiva[],
  storico: LavorazioneArchiviata[],
  preventivi: PreventivoRecord[],
  documenti: DocumentoGestionale[],
): MezzoGestito[] {
  const rows: MezzoGestito[] = baseMezzi.map((m) => ({ ...m }));

  function coveredByRow(lav: LavorazioneAttiva | LavorazioneArchiviata): boolean {
    return rows.some((m) => lavorazioneMatchesMezzo(m, lav));
  }

  const synthLavKeys = new Set<string>();
  const lavAll = [...storico, ...attive];
  for (const lav of lavAll) {
    if (coveredByRow(lav)) continue;
    const k = lavSynthKey(lav);
    if (synthLavKeys.has(k)) continue;
    synthLavKeys.add(k);
    rows.push(mezzoFromLavorazione(lav));
  }

  for (const pv of preventivi) {
    if (rows.some((m) => preventivoMatchesMezzo(m, pv))) continue;
    rows.push(mezzoFromPreventivo(pv));
  }

  const seenDocMezzo = new Set<string>();
  for (const doc of documenti) {
    const r = resolveDocumentoApplicazione(doc);
    if (r.applicabilita !== "macchina" || !r.mezzoId?.trim()) continue;
    const mid = r.mezzoId.trim();
    if (rows.some((m) => m.id === mid)) continue;
    if (seenDocMezzo.has(mid)) continue;
    const stub = mezzoFromDocumento(doc);
    if (!stub) continue;
    seenDocMezzo.add(mid);
    rows.push(stub);
  }

  return rows;
}
