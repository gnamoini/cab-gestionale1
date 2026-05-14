/** Parsing date/time da testo libero; validazione solo a salvataggio (nessun blocco in digitazione). */

export function isoForEditDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 19) + "Z";
}

export function parseDateInputFlexible(raw: string): { ok: true; iso: string } | { ok: false } {
  const s = raw.trim();
  if (!s) return { ok: false };
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    return { ok: true, iso: new Date(parsed).toISOString() };
  }
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/.exec(s);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = parseInt(m[3], 10);
    const hh = m[4] !== undefined ? parseInt(m[4], 10) : 0;
    const mm = m[5] !== undefined ? parseInt(m[5], 10) : 0;
    const d = new Date(year, month, day, hh, mm, 0, 0);
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
      return { ok: true, iso: d.toISOString() };
    }
  }
  return { ok: false };
}

export function parseOptionalDateInput(raw: string): { ok: true; iso: string | null } | { ok: false } {
  const s = raw.trim();
  if (!s) return { ok: true, iso: null };
  return parseDateInputFlexible(s);
}
