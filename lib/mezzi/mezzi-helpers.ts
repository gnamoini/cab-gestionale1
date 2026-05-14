import { documentoRelevantePerMezzo, preventivoMatchesMezzo } from "@/lib/mezzi/mezzi-hub-merge";
import type { MezzoGestito, MezzoInterventoLavorazione, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";
import { MEZZI_OGGI_DEMO } from "@/lib/mezzi/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import { Q_FOCUS_MEZZO } from "@/lib/navigation/dashboard-log-links";
import { Q_PREVENTIVI_MEZZO } from "@/lib/preventivi/preventivi-query";

export function mezzoMatchesSearch(m: MezzoGestito, q: string): boolean {
  if (!q) return true;
  const hay = [
    m.targa,
    m.matricola,
    m.numeroScuderia,
    m.cliente,
    m.marca,
    m.modello,
    m.utilizzatore,
    m.tipoAttrezzatura,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function mezzoMatchesFilters(
  m: MezzoGestito,
  opts: {
    filtroCliente: string;
    filtroMarca: string;
    filtroModello: string;
    filtroTipo: string;
  },
): boolean {
  if (opts.filtroCliente !== "__tutti__" && m.cliente !== opts.filtroCliente) return false;
  if (opts.filtroMarca !== "__tutti__" && m.marca !== opts.filtroMarca) return false;
  if (opts.filtroModello !== "__tutti__" && m.modello !== opts.filtroModello) return false;
  if (opts.filtroTipo !== "__tutti__" && m.tipoAttrezzatura !== opts.filtroTipo) return false;
  return true;
}

export function countDocumentiPerMezzo(m: MezzoGestito, documenti: DocumentoGestionale[]): number {
  return documenti.filter((d) => documentoRelevantePerMezzo(d, m)).length;
}

export function countPreventiviPerMezzo(m: MezzoGestito, preventivi: PreventivoRecord[]): number {
  return preventivi.filter((p) => preventivoMatchesMezzo(m, p)).length;
}

export function ultimaLavorazioneLabel(rows: MezzoInterventoLavorazione[]): string {
  if (rows.length === 0) return "—";
  const first = rows[0]!;
  try {
    return new Date(first.dataIngresso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return first.dataIngresso.slice(0, 10);
  }
}

export function hrefDocumentiPerMezzo(m: MezzoGestito): string {
  return `/documenti?mezzoId=${encodeURIComponent(m.id)}`;
}

export function hrefLavorazioniPerMezzo(m: MezzoGestito): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_MEZZO, m.id);
  return `/lavorazioni?${sp.toString()}`;
}

export function hrefPreventiviPerMezzo(m: MezzoGestito): string {
  const sp = new URLSearchParams();
  sp.set(Q_PREVENTIVI_MEZZO, m.id);
  return `/preventivi?${sp.toString()}`;
}

export function compareMezzi(
  a: MezzoGestito,
  b: MezzoGestito,
  sortColumn: MezziSortKey | null,
  sortPhase: MezziSortPhase,
  naturalOrder: (x: MezzoGestito, y: MezzoGestito) => number,
): number {
  if (sortPhase === "natural" || sortColumn === null) {
    return naturalOrder(a, b);
  }
  const dir = sortPhase === "asc" ? 1 : -1;
  let cmp = 0;
  switch (sortColumn) {
    case "cliente":
      cmp = a.cliente.localeCompare(b.cliente, "it");
      break;
    case "marca":
      cmp = `${a.marca} ${a.modello}`.localeCompare(`${b.marca} ${b.modello}`, "it");
      break;
    case "targa":
      cmp = a.targa.localeCompare(b.targa, "it");
      break;
    case "matricola":
      cmp = a.matricola.localeCompare(b.matricola, "it");
      break;
    default:
      cmp = 0;
  }
  if (cmp !== 0) return cmp * dir;
  return naturalOrder(a, b);
}

function parseIso(s: string): number {
  return new Date(s).getTime();
}

export function interventiUltimi12Mesi(rows: MezzoInterventoLavorazione[], oggiIso = MEZZI_OGGI_DEMO): number {
  const end = parseIso(oggiIso);
  const start = end - 365 * 86400000;
  return rows.filter((r) => {
    const t = parseIso(r.dataIngresso);
    return !Number.isNaN(t) && t >= start && t <= end;
  }).length;
}

export function mediaGiorniFermoInterventi(rows: MezzoInterventoLavorazione[]): number | null {
  const done = rows.filter((r) => r.dataCompletamento && r.durataGiorniNum > 0);
  if (done.length === 0) return null;
  const sum = done.reduce((acc, r) => acc + r.durataGiorniNum, 0);
  return Math.round((sum / done.length) * 10) / 10;
}

export function ultimoInterventoIso(rows: MezzoInterventoLavorazione[]): string | null {
  if (rows.length === 0) return null;
  return rows[0]!.dataIngresso;
}

export type FrequenzaGuasti = "BASSA" | "MEDIA" | "ALTA";

export type AffidabilitaBadge = "affidabile" | "attenzione" | "critico";

export function frequenzaGuastiDaInterventi(rows: MezzoInterventoLavorazione[]): FrequenzaGuasti {
  const guasti = rows.filter(
    (r) =>
      /guasto|avaria|fermo|emergenza|critico/i.test(r.tipoIntervento) ||
      /guasto|avaria|stop|perdita/i.test(r.descrizione),
  ).length;
  if (guasti >= 3) return "ALTA";
  if (guasti >= 1) return "MEDIA";
  return "BASSA";
}

export function badgeAffidabilitaDaInterventi(
  m: MezzoGestito,
  rows: MezzoInterventoLavorazione[],
  oggiIso = MEZZI_OGGI_DEMO,
): AffidabilitaBadge {
  const freq = frequenzaGuastiDaInterventi(rows);
  const media = mediaGiorniFermoInterventi(rows) ?? 0;
  if (freq === "ALTA" || media >= 14 || m.priorita === "alta") return "critico";
  if (freq === "MEDIA" || media >= 5 || m.priorita === "media") return "attenzione";
  return "affidabile";
}

/** KPI: mezzi con almeno un intervento (ingresso) negli ultimi 12 mesi. */
export function mezziConInterventiRecenti(
  mezzi: MezzoGestito[],
  getRows: (m: MezzoGestito) => MezzoInterventoLavorazione[],
  oggiIso = MEZZI_OGGI_DEMO,
): number {
  return mezzi.filter((m) => interventiUltimi12Mesi(getRows(m), oggiIso) > 0).length;
}

const MEZZO_LOG_FIELDS: { key: keyof MezzoGestito; label: string }[] = [
  { key: "cliente", label: "Cliente" },
  { key: "utilizzatore", label: "Utilizzatore" },
  { key: "marca", label: "Marca" },
  { key: "modello", label: "Modello" },
  { key: "targa", label: "Targa" },
  { key: "matricola", label: "Matricola" },
  { key: "numeroScuderia", label: "N. scuderia" },
  { key: "tipoAttrezzatura", label: "Tipo attrezzatura" },
  { key: "anno", label: "Anno" },
  { key: "oreKm", label: "Ore / km" },
  { key: "dataUltimaUscita", label: "Ultima uscita" },
  { key: "note", label: "Note" },
  { key: "priorita", label: "Priorità" },
];

export function diffMezzoChanges(
  prima: MezzoGestito,
  dopo: MezzoGestito,
): { campo: string; prima: string; dopo: string }[] {
  const out: { campo: string; prima: string; dopo: string }[] = [];
  for (const { key, label } of MEZZO_LOG_FIELDS) {
    const a = prima[key];
    const b = dopo[key];
    const sa = a === undefined || a === null ? "" : String(a);
    const sb = b === undefined || b === null ? "" : String(b);
    if (sa === sb) continue;
    out.push({ campo: label, prima: sa || "—", dopo: sb || "—" });
  }
  return out;
}
