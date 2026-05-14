import { lookupLearnedPhrase, recordDescriptionCorrection } from "@/lib/preventivi/preventivi-learning-storage";
import { loadPreventivi } from "@/lib/preventivi/preventivi-storage";
import type { PreventivoRecord } from "@/lib/preventivi/types";

function splitTechChunks(raw: string): string[] {
  return raw
    .split(/[+;,\n\r]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function heuristicLine(chunk: string): string {
  const low = chunk.toLowerCase();
  if (/^(test|collaudo)/i.test(chunk.trim())) return "Collaudo funzionale finale attrezzatura";
  if (/(perdit|perdite|circuito\s+idraul)/.test(low)) return "Verifica circuito idraulico e controllo perdite";
  if (/(pompa)/.test(low) && /(cambio|sostitu|sostit)/.test(low)) return "Smontaggio e sostituzione pompa usurata";
  if (/(cambio|sostitu|sostit|smont)/.test(low)) {
    const rest = chunk.replace(/^(cambio|sostituzione|sostituire|smontaggio)\s+/i, "").trim();
    return rest ? `Intervento di sostituzione: ${rest.charAt(0).toUpperCase() + rest.slice(1)}` : "Intervento di sostituzione componente";
  }
  if (/(controllo|verifica|ispezione)/.test(low)) return `Controllo e verifica: ${chunk.charAt(0).toUpperCase() + chunk.slice(1)}`;
  return chunk.charAt(0).toUpperCase() + chunk.slice(1);
}

function mapChunk(chunk: string): string {
  const learned = lookupLearnedPhrase(chunk);
  if (learned) return learned;
  return heuristicLine(chunk);
}

function hintsFromSimilarPreventivi(techNorm: string, targa: string, matricola: string, codiciRicambi: string[]): string[] {
  const hints: string[] = [];
  const seen = new Set<string>();
  const all = loadPreventivi();
  const scored = all
    .map((p) => {
      let sc = 0;
      if (targa && p.targa && p.targa.toLowerCase() === targa.toLowerCase()) sc += 40;
      if (matricola && p.matricola && p.matricola.toLowerCase() === matricola.toLowerCase()) sc += 40;
      const pcodes = p.righeRicambi.map((r) => r.codiceOE.toLowerCase()).filter(Boolean);
      for (const c of codiciRicambi) {
        if (c && pcodes.some((x) => x.includes(c) || c.includes(x))) sc += 8;
      }
      if (techNorm.length > 12 && p.descrizioneLavorazioniTecnicaSorgente) {
        const a = techNorm.slice(0, 60);
        const b = p.descrizioneLavorazioniTecnicaSorgente.toLowerCase().slice(0, 60);
        if (a && b && (a.includes(b) || b.includes(a))) sc += 15;
      }
      return { p, sc };
    })
    .filter((x) => x.sc >= 25)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, 3);

  for (const { p } of scored) {
    const lines = p.descrizioneLavorazioniCliente
      .split("\n")
      .map((l) => l.replace(/^-\s*/, "").trim())
      .filter(Boolean);
    for (const line of lines.slice(0, 4)) {
      const k = line.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        hints.push(`Dal precedente intervento simile: ${line}`);
      }
    }
  }
  return hints.slice(0, 6);
}

/** Trasforma note tecniche in elenco professionale per il cliente. */
export function trasformaDescrizioneLavorazioni(technicalRaw: string, ctx: { targa: string; matricola: string; codiciRicambi: string[] }): string {
  const techNorm = technicalRaw.trim().toLowerCase();
  const hints = hintsFromSimilarPreventivi(techNorm, ctx.targa, ctx.matricola, ctx.codiciRicambi);
  const chunks = splitTechChunks(technicalRaw);
  const lines = chunks.map((c) => mapChunk(c));
  const merged = [...hints, ...lines];
  const uniq: string[] = [];
  const u = new Set<string>();
  for (const m of merged) {
    const k = m.toLowerCase();
    if (u.has(k)) continue;
    u.add(k);
    uniq.push(m);
  }
  return uniq.map((l) => (l.startsWith("-") ? l : `- ${l}`)).join("\n");
}

export function maybeRecordLearningOnSave(prev: PreventivoRecord | null, next: PreventivoRecord): void {
  if (next.descrizioneLavorazioniCliente === next.descrizioneGenerataAuto) return;
  if (prev && next.descrizioneLavorazioniCliente === prev.descrizioneLavorazioniCliente) return;
  const tech = next.descrizioneLavorazioniTecnicaSorgente || prev?.descrizioneLavorazioniTecnicaSorgente || "";
  if (!tech.trim()) return;
  recordDescriptionCorrection(tech, next.descrizioneLavorazioniCliente);
}
