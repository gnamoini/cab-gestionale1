export type ReportPeriodPreset = "current_month" | "last_3_months" | "last_12_months" | "ytd" | "custom";
export type ReportCompareMode = "none" | "prev_year" | "prev_period";

export type DateRange = { start: Date; end: Date };

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addLocalDays(d: Date, days: number): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + days,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  );
}

function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const d = new Date(y, mo, da, 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Intervallo inclusivo [start,end] in orario locale. */
export function resolvePresetRange(
  anchor: Date,
  preset: ReportPeriodPreset,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const end = endOfLocalDay(anchor);
  if (preset === "custom") {
    const sf = customFrom ? parseYmd(customFrom) : null;
    const st = customTo ? parseYmd(customTo) : null;
    const start = sf ? startOfLocalDay(sf) : startOfLocalDay(addLocalDays(end, -30));
    const end2 = st ? endOfLocalDay(st) : end;
    if (start.getTime() <= end2.getTime()) return { start, end: end2 };
    return { start: startOfLocalDay(end2), end: endOfLocalDay(start) };
  }
  if (preset === "current_month") {
    return { start: startOfLocalDay(new Date(end.getFullYear(), end.getMonth(), 1)), end };
  }
  if (preset === "last_3_months") {
    const start = startOfLocalDay(new Date(end.getFullYear(), end.getMonth() - 2, 1));
    return { start, end };
  }
  if (preset === "last_12_months") {
    const start = startOfLocalDay(new Date(end.getFullYear(), end.getMonth() - 11, 1));
    return { start, end };
  }
  if (preset === "ytd") {
    return { start: startOfLocalDay(new Date(end.getFullYear(), 0, 1)), end };
  }
  return { start: startOfLocalDay(new Date(end.getFullYear(), end.getMonth(), 1)), end };
}

export function compareRangeFor(cur: DateRange, mode: ReportCompareMode): DateRange | null {
  if (mode === "none") return null;
  const ms = cur.end.getTime() - cur.start.getTime();
  if (mode === "prev_period") {
    const endPrev = new Date(cur.start.getTime() - 1);
    const startPrev = new Date(endPrev.getTime() - ms);
    return { start: startOfLocalDay(startPrev), end: endOfLocalDay(endPrev) };
  }
  const start = addYearsKeepCalendar(cur.start, -1);
  const end = addYearsKeepCalendar(cur.end, -1);
  return { start: startOfLocalDay(start), end: endOfLocalDay(end) };
}

function addYearsKeepCalendar(d: Date, deltaYears: number): Date {
  return new Date(
    d.getFullYear() + deltaYears,
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  );
}

export function isoInRange(iso: string, r: DateRange): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= r.start.getTime() && t <= r.end.getTime();
}

export function deltaPct(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatCompareLabel(mode: ReportCompareMode, cur: DateRange, prev: DateRange | null): string {
  if (!prev || mode === "none") return "";
  const fmt = (d: Date) =>
    d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  if (mode === "prev_year") {
    return `Confronto: ${fmt(cur.start)} — ${fmt(cur.end)} vs ${fmt(prev.start)} — ${fmt(prev.end)}`;
  }
  return `Confronto con periodo precedente (${fmt(prev.start)} — ${fmt(prev.end)})`;
}
