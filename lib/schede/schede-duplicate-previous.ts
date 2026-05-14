import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function sameMezzo(
  a: { targa: string; matricola: string; macchina: string },
  b: { targa: string; matricola: string; macchina: string },
): boolean {
  const ta = norm(a.targa);
  const tb = norm(b.targa);
  if (ta && tb && ta === tb) return true;
  const ma = norm(a.matricola);
  const mb = norm(b.matricola);
  if (ma && mb && ma === mb) return true;
  const macA = norm(a.macchina);
  const macB = norm(b.macchina);
  if (macA && macB && macA === macB) return true;
  return false;
}

/** Lavorazione precedente (stesso mezzo) più recente rispetto a `ref`, escluso `excludeId`. */
export function findPreviousLavorazioneStessoMezzo(
  ref: LavorazioneAttiva | LavorazioneArchiviata,
  excludeId: string,
  attive: LavorazioneAttiva[],
  storico: LavorazioneArchiviata[],
): LavorazioneAttiva | LavorazioneArchiviata | null {
  const refT = new Date(ref.dataIngresso).getTime();
  const cands: { lav: LavorazioneAttiva | LavorazioneArchiviata; t: number }[] = [];
  for (const a of attive) {
    if (a.id === excludeId) continue;
    if (!sameMezzo(a, ref)) continue;
    cands.push({ lav: a, t: new Date(a.dataIngresso).getTime() });
  }
  for (const s of storico) {
    if (s.id === excludeId) continue;
    if (!sameMezzo(s, ref)) continue;
    cands.push({ lav: s, t: new Date(s.dataIngresso).getTime() });
  }
  cands.sort((x, y) => y.t - x.t);
  for (const c of cands) {
    if (c.t < refT) return c.lav;
  }
  return null;
}
