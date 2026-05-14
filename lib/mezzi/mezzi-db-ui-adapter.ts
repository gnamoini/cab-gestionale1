import type { PreventivoRecord, PreventivoStato } from "@/lib/preventivi/types";
import type { DocumentoGestionale, DocumentoTipoFile } from "@/lib/types/gestionale";
import type { MezziLogEntryLike } from "@/lib/gestionale-log/view-model";
import { diffMezzoChanges } from "@/lib/mezzi/mezzi-helpers";
import type { DocumentoRow, LogModificaRow, MezzoRow, PreventivoRow } from "@/src/types/supabase-tables";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { MEZZI_OGGI_DEMO, type MezzoGestito } from "@/lib/mezzi/types";

function str(v: string | null | undefined, fallback = "—"): string {
  const t = v?.trim();
  return t && t.length > 0 ? t : fallback;
}

/** Campi UI non presenti su DB: valori di default stabili. */
export function toMezzoUI(row: MezzoRow): MezzoGestito {
  return {
    id: row.id,
    cliente: row.cliente,
    utilizzatore: str(row.utilizzatore, "—"),
    marca: row.marca,
    modello: row.modello,
    targa: str(row.targa, "—"),
    matricola: row.matricola,
    numeroScuderia: row.numero_scuderia?.trim() || undefined,
    tipoAttrezzatura: "—",
    anno: row.anno ?? new Date().getFullYear(),
    oreKm: 0,
    statoAttuale: "Operativo",
    dataUltimaUscita: MEZZI_OGGI_DEMO,
    note: "",
    priorita: "normale",
    hubSynthetic: false,
  };
}

const CAT_MAP: Record<DocumentoRow["categoria"], DocumentoGestionale["categoria"]> = {
  listino: "listini",
  manuale: "manuali",
  catalogo: "cataloghi",
  altro: "altro",
};

function guessTipoFile(url: string): DocumentoTipoFile {
  const u = url.toLowerCase();
  if (u.endsWith(".pdf")) return "pdf";
  if (u.endsWith(".doc") || u.endsWith(".docx")) return "word";
  if (u.endsWith(".xls") || u.endsWith(".xlsx")) return "excel";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".png")) return "immagine";
  return "altro";
}

export function documentoRowToGestionale(row: DocumentoRow): DocumentoGestionale {
  const meta = row.meta ?? {};
  const nome = typeof meta.nome === "string" && meta.nome.trim() ? meta.nome.trim() : row.url_file.split("/").pop() ?? "Documento";
  const applicabilita = row.mezzo_id ? ("macchina" as const) : undefined;
  return {
    id: row.id,
    nome,
    categoria: CAT_MAP[row.categoria] ?? "altro",
    marca: row.marca,
    macchina: row.modello ?? "—",
    tipoFile: guessTipoFile(row.url_file),
    autoreCaricamento: typeof meta.autoreCaricamento === "string" ? meta.autoreCaricamento : "—",
    note: typeof meta.note === "string" ? meta.note : undefined,
    ultimaModifica: row.created_at,
    caricatoIl: row.created_at,
    dimensioneKb: typeof meta.dimensioneKb === "number" ? meta.dimensioneKb : 0,
    applicabilita,
    marcaKey: row.marca,
    modelloKey: row.modello ?? undefined,
    mezzoId: row.mezzo_id ?? undefined,
    urlDocumento: row.url_file,
  };
}

function emptyManodopera(): PreventivoRecord["manodopera"] {
  return { oreTotali: 0, righeAddetti: [], costoOrario: 0, scontoPercent: 0 };
}

/** Stub per lista hub / PDF minimi da riga Supabase (dettagli JSON opzionale). */
export function preventivoRowToRecordStub(row: PreventivoRow, mezzo: MezzoRow | null): PreventivoRecord {
  const det = (row.dettagli ?? {}) as Record<string, unknown>;
  const numero = typeof det.numero === "string" && det.numero.trim() ? det.numero.trim() : `PV-${row.id.slice(0, 8)}`;
  const stato = (typeof det.stato === "string" ? det.stato : "bozza") as PreventivoStato;
  const righeRaw = det.righeRicambi;
  const righeRicambi: PreventivoRecord["righeRicambi"] = Array.isArray(righeRaw)
    ? (righeRaw as PreventivoRecord["righeRicambi"])
    : [];
  const manoRaw = det.manodopera as Partial<PreventivoRecord["manodopera"]> | undefined;
  const manodopera: PreventivoRecord["manodopera"] =
    manoRaw && typeof manoRaw.oreTotali === "number"
      ? {
          oreTotali: manoRaw.oreTotali,
          righeAddetti: Array.isArray(manoRaw.righeAddetti) ? manoRaw.righeAddetti : [],
          costoOrario: Number(manoRaw.costoOrario) || 0,
          scontoPercent: Number(manoRaw.scontoPercent) || 0,
        }
      : emptyManodopera();

  const m = mezzo;
  return {
    id: row.id,
    numero,
    dataCreazione: row.created_at,
    aggiornatoAt: row.updated_at,
    stato,
    lavorazioneId: row.lavorazione_id ?? "",
    lavorazioneOrigine: (det.lavorazioneOrigine === "storico" ? "storico" : "attiva") as PreventivoRecord["lavorazioneOrigine"],
    cliente: row.cliente,
    cantiere: typeof det.cantiere === "string" ? det.cantiere : "",
    utilizzatore: typeof det.utilizzatore === "string" ? det.utilizzatore : str(m?.utilizzatore, ""),
    macchinaRiassunto:
      typeof det.macchinaRiassunto === "string"
        ? det.macchinaRiassunto
        : m
          ? `${m.marca} ${m.modello}`.trim()
          : "—",
    targa: m ? str(m.targa, "") : typeof det.targa === "string" ? det.targa : "",
    matricola: m?.matricola ?? (typeof det.matricola === "string" ? det.matricola : ""),
    nScuderia: m?.numero_scuderia ?? (typeof det.nScuderia === "string" ? det.nScuderia : "") ?? "",
    marcaAttrezzatura: m?.marca ?? (typeof det.marcaAttrezzatura === "string" ? det.marcaAttrezzatura : ""),
    modelloAttrezzatura: m?.modello ?? (typeof det.modelloAttrezzatura === "string" ? det.modelloAttrezzatura : ""),
    descrizioneLavorazioniCliente: typeof det.descrizioneLavorazioniCliente === "string" ? det.descrizioneLavorazioniCliente : "—",
    descrizioneLavorazioniTecnicaSorgente:
      typeof det.descrizioneLavorazioniTecnicaSorgente === "string" ? det.descrizioneLavorazioniTecnicaSorgente : "",
    descrizioneGenerataAuto: typeof det.descrizioneGenerataAuto === "string" ? det.descrizioneGenerataAuto : "",
    righeRicambi,
    manodopera,
    noteFinali: typeof det.noteFinali === "string" ? det.noteFinali : "",
    totaleRicambi: typeof det.totaleRicambi === "number" ? det.totaleRicambi : 0,
    totaleManodopera: typeof det.totaleManodopera === "number" ? det.totaleManodopera : 0,
    totaleFinale: row.totale,
    createdBy: typeof det.createdBy === "string" ? det.createdBy : "—",
    lastEditedBy: typeof det.lastEditedBy === "string" ? det.lastEditedBy : "—",
  };
}

/** Costruisce oggetto minimale per `lavorazioneMatchesMezzo` da riga DB + mezzo join. */
export function lavRowToMatchShape(row: LavorazioneListRow) {
  const m = row.mezzo;
  const macchina = m ? `${m.marca} ${m.modello}`.trim() : "—";
  return {
    id: row.id,
    targa: m ? str(m.targa, "") : "—",
    matricola: m?.matricola ?? "—",
    macchina,
    nScuderia: m?.numero_scuderia ?? "",
  };
}

export type MezziHubLogEntry = MezziLogEntryLike & { id: string };

function labelMezzoFromRow(r: MezzoRow): string {
  const m = r.matricola?.trim();
  if (m) return m;
  const t = r.targa?.trim();
  if (t) return t;
  return r.id.length >= 8 ? r.id.slice(0, 8) : r.id;
}

/** Voce log anagrafica mezzi da `log_modifiche` (payload audit CREATE/UPDATE/DELETE). */
export function logModificaRowToMezziHubLogEntry(row: LogModificaRow): MezziHubLogEntry {
  const p = row.payload as { snapshot?: unknown; before?: unknown; after?: unknown } | null | undefined;
  let mezzo = row.entita_id.length >= 8 ? row.entita_id.slice(0, 8) : row.entita_id;
  let changes: MezziLogEntryLike["changes"] = [];
  let tipo: MezziLogEntryLike["tipo"] = "update";
  const riepilogo = row.azione;

  if (row.azione === "CREATE") {
    tipo = "aggiunta";
    if (p?.snapshot && typeof p.snapshot === "object") {
      mezzo = labelMezzoFromRow(p.snapshot as MezzoRow);
    }
  } else if (row.azione === "DELETE") {
    tipo = "rimozione";
    if (p?.snapshot && typeof p.snapshot === "object") {
      mezzo = labelMezzoFromRow(p.snapshot as MezzoRow);
    }
  } else if (row.azione === "UPDATE") {
    tipo = "update";
    if (p?.before && p?.after && typeof p.before === "object" && typeof p.after === "object") {
      const beforeRow = p.before as MezzoRow;
      const afterRow = p.after as MezzoRow;
      mezzo = labelMezzoFromRow(afterRow);
      changes = diffMezzoChanges(toMezzoUI(beforeRow), toMezzoUI(afterRow));
    }
  }

  return {
    id: row.id,
    tipo,
    mezzo,
    riepilogo,
    autore: row.autore_id?.slice(0, 8) ?? "—",
    at: row.created_at,
    changes,
  };
}
