export const MAGAZZINO_PRODOTTI_REFRESH_EVENT = "cab-magazzino-prodotti-refresh";

export function dispatchMagazzinoProdottiRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MAGAZZINO_PRODOTTI_REFRESH_EVENT));
}
