import { durataMsStorico } from "@/lib/lavorazioni/duration";
import { lavorazioneMatchesMezzo } from "@/lib/mezzi/lavorazioni-sync";
import { lavRowToMatchShape } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito, MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { StatoLavorazione } from "@/src/types/supabase-tables";

const STORICO_STATI = new Set<StatoLavorazione>(["completata", "consegnata", "annullata"]);

const STATO_LABEL: Record<StatoLavorazione, string> = {
  bozza: "Bozza",
  in_coda: "In coda",
  in_officina: "In officina",
  in_attesa_ricambi: "In attesa ricambi",
  completata: "Completata",
  consegnata: "Consegnata",
  annullata: "Annullata",
};

function prioritaIt(p: string): string {
  if (p === "alta") return "Alta";
  if (p === "media") return "Media";
  if (p === "bassa") return "Bassa";
  if (p === "urgente") return "Urgente";
  return p;
}

function giorniTra(isoIn: string, isoOut: string | null): { label: string; num: number } {
  if (!isoOut?.trim()) return { label: "—", num: 0 };
  const ms = durataMsStorico(isoIn, isoOut);
  const g = ms / 86400000;
  const rounded = Math.round(g * 10) / 10;
  if (rounded === 0) return { label: "< 1 giorno", num: g };
  return { label: `${rounded} giorni`, num: g };
}

export function labelLavorazioneStatoDb(stato: StatoLavorazione): string {
  return STATO_LABEL[stato] ?? stato;
}

export function isLavorazioneStoricoDb(stato: StatoLavorazione): boolean {
  return STORICO_STATI.has(stato);
}

export function interventiMezzoDaLavorazioniDb(
  m: MezzoGestito,
  rows: LavorazioneListRow[],
): MezzoInterventoLavorazione[] {
  const out: MezzoInterventoLavorazione[] = [];
  for (const row of rows) {
    if (!lavorazioneMatchesMezzo(m, lavRowToMatchShape(row))) continue;
    const ing = row.data_ingresso?.trim() ? row.data_ingresso : row.created_at;
    const fin = row.data_uscita;
    const statoLabel = labelLavorazioneStatoDb(row.stato);
    if (STORICO_STATI.has(row.stato)) {
      const { label, num } = giorniTra(ing, fin);
      out.push({
        id: row.id,
        origine: "storico",
        dataIngresso: ing,
        dataCompletamento: fin,
        durataGiorniLabel: label,
        durataGiorniNum: num,
        tipoIntervento: statoLabel,
        descrizione: (row.note ?? "").trim() || "—",
        prioritaLabel: prioritaIt(row.priorita),
        statoFinale: statoLabel,
      });
    } else {
      const completed = fin;
      const dur = completed ? giorniTra(ing, completed) : { label: "In corso", num: 0 };
      out.push({
        id: row.id,
        origine: "attiva",
        dataIngresso: ing,
        dataCompletamento: completed,
        durataGiorniLabel: dur.label,
        durataGiorniNum: dur.num,
        tipoIntervento: statoLabel,
        descrizione: (row.note ?? "").trim() || "—",
        prioritaLabel: prioritaIt(row.priorita),
        statoFinale: completed ? statoLabel : "In officina",
      });
    }
  }
  out.sort((a, b) => {
    const ta = new Date(a.dataIngresso).getTime();
    const tb = new Date(b.dataIngresso).getTime();
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
  return out;
}

export function mezzoHaLavorazioneAttivaDb(m: MezzoGestito, rows: LavorazioneListRow[]): boolean {
  return rows.some((row) => {
    if (STORICO_STATI.has(row.stato)) return false;
    return lavorazioneMatchesMezzo(m, lavRowToMatchShape(row));
  });
}
