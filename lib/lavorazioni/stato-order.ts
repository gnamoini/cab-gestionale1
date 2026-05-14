import { DEFAULT_STATI_LAVORAZIONI } from "@/lib/lavorazioni/constants";

const DEFAULT_ORDER_IDS: readonly string[] = DEFAULT_STATI_LAVORAZIONI.map((s) => s.id);

/** Ordine workflow: usa l’ordine corrente degli stati in impostazioni se fornito. */
export function statoWorkflowOrderIndex(statoId: string, orderIds?: readonly string[]): number {
  const order = orderIds?.length ? orderIds : DEFAULT_ORDER_IDS;
  const i = order.indexOf(statoId);
  if (i >= 0) return i;
  return order.length + 100;
}
