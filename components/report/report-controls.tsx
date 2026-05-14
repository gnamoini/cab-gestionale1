"use client";

import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";

const selectBase =
  "rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-orange-400/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

export function ReportControls({
  preset,
  onPreset,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  compareMode,
  onCompareMode,
}: {
  preset: ReportPeriodPreset;
  onPreset: (p: ReportPeriodPreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (s: string) => void;
  onCustomTo: (s: string) => void;
  compareMode: ReportCompareMode;
  onCompareMode: (m: ReportCompareMode) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Periodo analisi</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["current_month", "Mese corrente"],
                ["last_3_months", "Ultimi 3 mesi"],
                ["last_12_months", "Ultimi 12 mesi"],
                ["ytd", "Anno corrente"],
                ["custom", "Personalizzato"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onPreset(id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  preset === id
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-1.5 lg:w-auto lg:min-w-[14rem]">
          <label htmlFor="report-compare" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Confronto periodi
          </label>
          <select
            id="report-compare"
            value={compareMode}
            onChange={(e) => onCompareMode(e.target.value as ReportCompareMode)}
            className={selectBase}
          >
            <option value="none">Nessuno</option>
            <option value="prev_period">Periodo precedente</option>
            <option value="prev_year">Stesso periodo anno precedente</option>
          </select>
        </div>
      </div>

      {preset === "custom" ? (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <label className="text-xs text-zinc-600 dark:text-zinc-400">
            Da
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFrom(e.target.value)}
              className={`${selectBase} mt-1 block`}
            />
          </label>
          <label className="text-xs text-zinc-600 dark:text-zinc-400">
            A
            <input type="date" value={customTo} onChange={(e) => onCustomTo(e.target.value)} className={`${selectBase} mt-1 block`} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
