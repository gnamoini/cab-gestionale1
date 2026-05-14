import { DEFAULT_STATI_LAVORAZIONI } from "@/lib/lavorazioni/constants";
import { durataMsStorico } from "@/lib/lavorazioni/duration";
import { isCompletataForReport, isStatoLavorazioneChiusoDb } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import type { MezzoGestito, MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { StatoLavorazione } from "@/src/types/supabase-tables";

type LavSnapshot = { attive: LavorazioneAttiva[]; storico: LavorazioneArchiviata[] };

let snapshot: LavSnapshot = { attive: [], storico: [] };

const listeners = new Set<() => void>();

export function setLavorazioniMezziSnapshot(next: LavSnapshot) {
  snapshot = {
    attive: next.attive.map((r) => ({ ...r })),
    storico: next.storico.map((r) => ({ ...r })),
  };
  listeners.forEach((fn) => fn());
}

export function getLavorazioniMezziSnapshot(): LavSnapshot {
  return {
    attive: snapshot.attive.map((r) => ({ ...r })),
    storico: snapshot.storico.map((r) => ({ ...r })),
  };
}

export function subscribeLavorazioniMezziSync(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function normMezzoKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match per identità mezzo: priorità matricola → targa → n. scuderia → marca+modello (campo macchina). */
export function lavorazioneMatchesMezzo(
  m: MezzoGestito,
  lav: { id: string; targa: string; matricola: string; macchina: string; nScuderia?: string },
): boolean {
  if (m.lavorazioneMezzoId && lav.id === m.lavorazioneMezzoId) return true;
  const nm = normMezzoKey(m.matricola);
  const lm = normMezzoKey(lav.matricola);
  if (nm && lm && nm === lm) return true;
  const nt = normMezzoKey(m.targa);
  const lt = normMezzoKey(lav.targa);
  if (nt && lt && nt === lt) return true;
  const nsM = normMezzoKey(m.numeroScuderia ?? "");
  const nsL = normMezzoKey(lav.nScuderia ?? "");
  if (nsM && nsL && nsM === nsL) return true;
  const ml = normMezzoKey(`${m.marca} ${m.modello}`).replace(/mercedes-benz/g, "mercedes");
  const mac = normMezzoKey(lav.macchina).replace(/mercedes-benz/g, "mercedes");
  if (!ml || !mac) return false;
  if (ml === mac) return true;
  if (mac.startsWith(ml) || ml.startsWith(mac)) return true;
  if (ml.length >= 4 && mac.includes(ml)) return true;
  const mlAlnum = ml.replace(/[^a-z0-9]/g, "");
  const macAlnum = mac.replace(/[^a-z0-9]/g, "");
  if (mlAlnum.length >= 6 && (macAlnum.includes(mlAlnum) || mlAlnum.includes(macAlnum))) return true;
  return false;
}

function labelStato(statoId: string): string {
  const legacy = DEFAULT_STATI_LAVORAZIONI.find((s) => s.id === statoId)?.label;
  if (legacy) return legacy;
  return labelLavorazioneStatoDb(statoId as StatoLavorazione);
}

function prioritaIt(p: string): string {
  if (p === "alta") return "Alta";
  if (p === "media") return "Media";
  if (p === "bassa") return "Bassa";
  return p;
}

export function mezzoHaLavorazioneAttiva(m: MezzoGestito, attive: LavorazioneAttiva[]): boolean {
  return attive.some((lav) => !isStatoLavorazioneChiusoDb(lav.statoId) && !isCompletataForReport(lav.statoId) && lavorazioneMatchesMezzo(m, lav));
}

function giorniTra(isoIn: string, isoOut: string | null): { label: string; num: number } {
  if (!isoOut?.trim()) return { label: "—", num: 0 };
  const ms = durataMsStorico(isoIn, isoOut);
  const g = ms / 86400000;
  const rounded = Math.round(g * 10) / 10;
  if (rounded === 0) return { label: "< 1 giorno", num: g };
  return { label: `${rounded} giorni`, num: g };
}

/** Interventi da tabella storico + lavorazioni attive collegate (in corso). */
export function interventiMezzoDaLavorazioni(
  m: MezzoGestito,
  attive: LavorazioneAttiva[],
  storico: LavorazioneArchiviata[],
): MezzoInterventoLavorazione[] {
  const out: MezzoInterventoLavorazione[] = [];

  for (const lav of storico) {
    if (!lavorazioneMatchesMezzo(m, lav)) continue;
    const { label, num } = giorniTra(lav.dataIngresso, lav.dataCompletamento);
    out.push({
      id: lav.id,
      origine: "storico",
      dataIngresso: lav.dataIngresso,
      dataCompletamento: lav.dataCompletamento,
      durataGiorniLabel: label,
      durataGiorniNum: num,
      tipoIntervento: labelStato(lav.statoFinaleId),
      descrizione: lav.noteInterne.trim() || "—",
      prioritaLabel: prioritaIt(lav.prioritaFinale),
      statoFinale: labelStato(lav.statoFinaleId),
    });
  }

  for (const lav of attive) {
    if (!lavorazioneMatchesMezzo(m, lav)) continue;
    if (isStatoLavorazioneChiusoDb(lav.statoId) || isCompletataForReport(lav.statoId)) continue;
    const completed = lav.dataCompletamento;
    const dur = completed ? giorniTra(lav.dataIngresso, completed) : { label: "In corso", num: 0 };
    out.push({
      id: lav.id,
      origine: "attiva",
      dataIngresso: lav.dataIngresso,
      dataCompletamento: lav.dataCompletamento,
      durataGiorniLabel: dur.label,
      durataGiorniNum: dur.num,
      tipoIntervento: labelStato(lav.statoId),
      descrizione: lav.noteInterne.trim() || "—",
      prioritaLabel: prioritaIt(lav.priorita),
      statoFinale: completed ? labelStato(lav.statoId) : "In officina",
    });
  }

  out.sort((a, b) => {
    const ta = new Date(a.dataIngresso).getTime();
    const tb = new Date(b.dataIngresso).getTime();
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
  return out;
}
