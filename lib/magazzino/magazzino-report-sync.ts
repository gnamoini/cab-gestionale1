import { MOCK_RICAMBI } from "@/lib/mock-data/magazzino";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

let snapshot: RicambioMagazzino[] = MOCK_RICAMBI.map((r) => ({ ...r }));
const listeners = new Set<() => void>();

export function setMagazzinoReportSnapshot(next: RicambioMagazzino[]): void {
  snapshot = next.map((r) => ({ ...r }));
  listeners.forEach((fn) => fn());
}

export function getMagazzinoReportSnapshot(): RicambioMagazzino[] {
  return snapshot.map((r) => ({ ...r }));
}

export function subscribeMagazzinoReportSync(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
