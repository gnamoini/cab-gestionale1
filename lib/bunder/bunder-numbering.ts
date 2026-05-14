import { bunderKindCode } from "@/lib/bunder/doc-kind-meta";
import type { BunderCommercialDocument, BunderDocKind } from "@/lib/bunder/types";

/** Riconosce formato TIPO26/0324 (3 lettere + 2 cifre anno + / + 4 cifre). */
export function parseBunderNumero(numero: string): { prefix: string; yy: number; seq: number } | null {
  const t = numero.trim().toUpperCase();
  const m = /^([A-Z]{3})(\d{2})\/(\d{4})$/.exec(t);
  if (!m) return null;
  const yy = Number(m[2]);
  const seq = Number(m[3]);
  if (!Number.isFinite(yy) || !Number.isFinite(seq)) return null;
  return { prefix: m[1], yy, seq };
}

export function allocateNextNumero(docs: BunderCommercialDocument[], kind: BunderDocKind, refDate = new Date()): string {
  const code = bunderKindCode(kind);
  const yy = refDate.getFullYear() % 100;
  let maxSeq = 0;
  for (const d of docs) {
    if (d.kind !== kind) continue;
    const p = parseBunderNumero(d.numeroProgressivo);
    if (!p || p.prefix !== code || p.yy !== yy) continue;
    maxSeq = Math.max(maxSeq, p.seq);
  }
  const next = maxSeq + 1;
  return `${code}${String(yy).padStart(2, "0")}/${String(next).padStart(4, "0")}`;
}
