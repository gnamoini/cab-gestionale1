import type { BunderDocKind } from "@/lib/bunder/types";

export const BUNDER_DOC_KIND_OPTIONS: { id: BunderDocKind; label: string; code: string }[] = [
  { id: "offerta_commerciale", label: "Offerta commerciale", code: "OFV" },
  { id: "preventivo", label: "Preventivo", code: "PRV" },
  { id: "ordine_acquisto", label: "Ordine di acquisto", code: "OAC" },
  { id: "conferma_ordine", label: "Conferma d'ordine", code: "CDO" },
  { id: "richiesta_offerta", label: "Richiesta offerta", code: "RQF" },
  { id: "quotazione_tecnica", label: "Quotazione tecnica", code: "QTC" },
  { id: "proposta_economica", label: "Proposta economica", code: "PEC" },
];

const KIND_TO_CODE: Record<BunderDocKind, string> = Object.fromEntries(
  BUNDER_DOC_KIND_OPTIONS.map((o) => [o.id, o.code]),
) as Record<BunderDocKind, string>;

export function bunderKindLabel(kind: BunderDocKind): string {
  return BUNDER_DOC_KIND_OPTIONS.find((o) => o.id === kind)?.label ?? kind;
}

export function bunderKindCode(kind: BunderDocKind): string {
  return KIND_TO_CODE[kind] ?? "DOC";
}
