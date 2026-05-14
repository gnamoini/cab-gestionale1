import { MOCK_MEZZI } from "@/lib/mock-data/mezzi";
import type { MezzoGestito } from "@/lib/mezzi/types";

let snapshot: MezzoGestito[] = MOCK_MEZZI.map((m) => ({ ...m }));
const listeners = new Set<() => void>();

export function setMezziReportSnapshot(next: MezzoGestito[]): void {
  snapshot = next.map((m) => ({ ...m }));
  listeners.forEach((fn) => fn());
}

export function getMezziReportSnapshot(): MezzoGestito[] {
  return snapshot.map((m) => ({ ...m }));
}

export function subscribeMezziReportSync(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
