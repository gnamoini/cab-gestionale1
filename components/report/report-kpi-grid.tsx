"use client";

import type { KpiCompareRow, KpiCardModel } from "@/lib/report/build-report-model";
import { ReportSparkline } from "@/components/report/report-sparkline";

function fmtPct(p: number | null): string | null {
  if (p == null) return null;
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

function arrowAndTone(
  deltaPct: number | null,
  invert: boolean | undefined,
): { arrow: string; tone: "up" | "down" | "flat" } {
  if (deltaPct == null || !Number.isFinite(deltaPct)) return { arrow: "→", tone: "flat" };
  if (deltaPct === 0) return { arrow: "→", tone: "flat" };
  if (invert) {
    if (deltaPct < 0) return { arrow: "↑", tone: "up" };
    return { arrow: "↓", tone: "down" };
  }
  if (deltaPct > 0) return { arrow: "↑", tone: "up" };
  return { arrow: "↓", tone: "down" };
}

function toneClass(tone: "up" | "down" | "flat"): string {
  if (tone === "flat") return "text-zinc-500 dark:text-zinc-400";
  return tone === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

function CompareBlock({ rows }: { rows: KpiCompareRow[] }) {
  return (
    <div className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      {rows.map((row) => {
        const pctStr = fmtPct(row.deltaPct);
        const { arrow, tone } = arrowAndTone(row.deltaPct, row.invert);
        const tc = toneClass(tone);
        return (
          <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
            <span className="font-medium text-zinc-500 dark:text-zinc-400">{row.label}</span>
            <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${tc}`}>
              <span className="text-sm leading-none">{arrow}</span>
              <span>
                {row.deltaAbs != null ? <span>{row.deltaAbs}</span> : null}
                {row.deltaAbs != null && pctStr != null ? <span className="font-normal text-zinc-400"> · </span> : null}
                {pctStr != null ? <span>{pctStr}</span> : row.deltaAbs == null ? <span>—</span> : null}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ReportKpiGrid({ items }: { items: KpiCardModel[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {items.map((k) => {
        const hasCmp = k.compareRows != null && k.compareRows.length > 0;
        return (
          <div
            key={k.id}
            className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{k.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">{k.value}</p>
            {k.sub ? <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{k.sub}</p> : null}
            {hasCmp ? <CompareBlock rows={k.compareRows!} /> : null}
            <div className="mt-auto flex items-end justify-between gap-2 pt-4">
              <span className="text-[11px] text-zinc-400">Trend 7gg (chiusure)</span>
              <ReportSparkline values={k.spark} className="text-orange-500" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
