/**
 * Slice «staging pubblico»: solo moduli maturi (dashboard, lavorazioni, mezzi).
 * Attivare in build/deploy con `NEXT_PUBLIC_STAGING_PUBLIC=1`.
 */
const TRUE = new Set(["1", "true", "yes", "on"]);

export function isStagingPublicSlice(): boolean {
  const v = process.env.NEXT_PUBLIC_STAGING_PUBLIC?.trim().toLowerCase() ?? "";
  return TRUE.has(v);
}

/** Percorsi gestionali non inclusi nello slice staging (redirect lato middleware). */
const STAGING_BLOCKED_PREFIXES = [
  "/preventivi",
  "/documenti",
  "/magazzino",
  "/bunder",
  "/report",
  "/supporto",
] as const;

export function isStagingBlockedPathname(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  const p = pathname.split("?")[0] ?? pathname;
  for (const prefix of STAGING_BLOCKED_PREFIXES) {
    if (p === prefix || p.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

/** Moduli sempre disponibili nello slice staging. */
export const STAGING_SAFE_HREFS = ["/dashboard", "/lavorazioni", "/mezzi"] as const;

export const STAGING_MODULE_BADGE = "In aggiornamento";
