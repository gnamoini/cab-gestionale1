/** Solo giorno (senza ora) per input type="date" e validazione discreta. */

export function isoToDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Visualizzazione italiana gg/mm/aaaa (timezone locale, coerente con calendario). */
export function isoToItDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${day}/${mo}/${y}`;
}

export function dateInputValueToIso(value: string): { ok: true; iso: string } | { ok: false } {
  const s = value.trim();
  if (!s) return { ok: false };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return { ok: false };
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const d = new Date(y, mo - 1, day, 12, 0, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return { ok: false };
  return { ok: true, iso: d.toISOString() };
}

/**
 * Accetta aaaa-mm-gg oppure gg/mm/aaaa (anche g/m senza zeri). Mezzogiorno locale → ISO.
 */
export function parseItalianDayToIso(value: string): { ok: true; iso: string } | { ok: false } {
  const s = value.trim();
  if (!s) return { ok: false };
  const isoYmd = dateInputValueToIso(s);
  if (isoYmd.ok) return isoYmd;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (!m) return { ok: false };
  const day = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  const d = new Date(y, mo - 1, day, 12, 0, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return { ok: false };
  return { ok: true, iso: d.toISOString() };
}

export function parseOptionalItalianDayToIso(
  value: string,
): { ok: true; iso: string | null } | { ok: false } {
  const s = value.trim();
  if (!s) return { ok: true, iso: null };
  return parseItalianDayToIso(s);
}

export function parseOptionalDateInputValue(value: string): { ok: true; iso: string | null } | { ok: false } {
  const s = value.trim();
  if (!s) return { ok: true, iso: null };
  return dateInputValueToIso(s);
}
