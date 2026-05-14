/** Notifica ascoltatori (es. pagina Report) che i log o snapshot potrebbero essere cambiati. */

const listeners = new Set<() => void>();

export function subscribeReportDataRefresh(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function bumpReportDataRefresh(): void {
  listeners.forEach((fn) => fn());
}
