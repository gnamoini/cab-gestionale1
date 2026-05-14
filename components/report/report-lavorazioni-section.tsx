"use client";

import { useMemo, useState } from "react";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { ReportYearlyForecastLineChart } from "@/components/report/report-charts";
import { erpBtnAccent, erpBtnNeutral } from "@/components/report/report-buttons";
import type { ReportCompareDetail } from "@/lib/report/build-report-model";
import { deltaPct } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import { buildLavorazioniYearMatrix, yearlyForecastLineModel, type LavorazioniYearRow } from "@/lib/report/lavorazioni-year-matrix";
import {
  loadLavorazioniManualMonthMap,
  saveLavorazioniManualMonthMap,
  type LavorazioniManualMonthMap,
} from "@/lib/report/lavorazioni-manual-storage";
import { dsSectionTitle, dsSurfaceCard, dsTableRow, dsTableWrap, dsScrollbar, dsTypoSmall } from "@/lib/ui/design-system";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"] as const;

function ymKey(y: number, m0: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

function cellInFilter(y: number, m0: number, r: DateRange): boolean {
  const cellStart = startOfLocalDay(new Date(y, m0, 1));
  const cellEnd = endOfLocalDay(new Date(y, m0 + 1, 0));
  return cellStart.getTime() <= r.end.getTime() && cellEnd.getTime() >= r.start.getTime();
}

function heatClass(v: number, rowMax: number): string {
  if (rowMax <= 0 || v <= 0) return "bg-[var(--cab-surface)] dark:bg-[var(--cab-bg-app)]";
  const t = Math.min(1, v / rowMax);
  if (t > 0.85) return "bg-orange-100/90 dark:bg-orange-950/35";
  if (t > 0.65) return "bg-orange-50/80 dark:bg-orange-950/20";
  if (t > 0.45) return "bg-zinc-50 dark:bg-zinc-900/40";
  return "bg-white dark:bg-zinc-950";
}

/** Scala colore e best/worst coerenti con il periodo selezionato (evita “celle a caso” al cambio range). */
function rowHeatMeta(row: LavorazioniYearRow, filterRange: DateRange) {
  const inMonths: { mi: number; v: number }[] = [];
  for (let mi = 0; mi < 12; mi += 1) {
    if (cellInFilter(row.year, mi, filterRange)) inMonths.push({ mi, v: row.months[mi] ?? 0 });
  }
  const pool = inMonths.length > 0 ? inMonths : row.months.map((v, mi) => ({ mi, v: v ?? 0 }));
  const rowMax = Math.max(1, ...pool.map((p) => p.v));
  let bestMi: number | null = null;
  let worstMi: number | null = null;
  let bestV = -1;
  let worstV = Number.POSITIVE_INFINITY;
  for (const { mi, v } of pool) {
    if (v > bestV) {
      bestV = v;
      bestMi = mi;
    }
    if (v < worstV) {
      worstV = v;
      worstMi = mi;
    }
  }
  if (bestV <= 0) bestMi = null;
  if (!Number.isFinite(worstV) || worstV === Number.POSITIVE_INFINITY) worstMi = null;
  if (bestMi !== null && worstMi !== null && bestMi === worstMi) worstMi = null;
  return { rowMax, bestMi, worstMi };
}

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

export function ReportLavorazioniSection({
  attive,
  storico,
  anchor,
  filterRange,
  compareDetail,
  histRev,
  onHistRev,
}: {
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  anchor: Date;
  filterRange: DateRange;
  compareDetail: ReportCompareDetail | null;
  histRev: number;
  onHistRev: () => void;
}) {
  const manual = useMemo(() => loadLavorazioniManualMonthMap(), [histRev]);
  const { rows, monthLabels, hasAnyData } = useMemo(
    () => buildLavorazioniYearMatrix(storico, attive, manual, anchor),
    [storico, attive, manual, anchor],
  );
  const forecast = useMemo(() => yearlyForecastLineModel(rows, anchor), [rows, anchor]);

  const heatByYear = useMemo(() => {
    const m = new Map<number, ReturnType<typeof rowHeatMeta>>();
    for (const row of rows) m.set(row.year, rowHeatMeta(row, filterRange));
    return m;
  }, [rows, filterRange]);

  const [open, setOpen] = useState(false);
  const [y, setY] = useState(String(anchor.getFullYear()));
  const [m, setM] = useState(String(anchor.getMonth() + 1).padStart(2, "0"));
  const [n, setN] = useState("0");

  function saveManual() {
    const key = `${y}-${m.padStart(2, "0")}`;
    const val = Math.max(0, Math.round(Number(n) || 0));
    const next: LavorazioniManualMonthMap = { ...manual, [key]: val };
    saveLavorazioniManualMonthMap(next);
    onHistRev();
    setOpen(false);
  }

  const cmpLine =
    compareDetail != null ? (
      <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">Confronto periodo</span>
        {" · "}
        Completate: {compareDetail.completedCur} vs {compareDetail.completedPrev} (
        {fmtPct(deltaPct(compareDetail.completedCur, compareDetail.completedPrev))}
        {compareDetail.completedCur - compareDetail.completedPrev !== 0 ? (
          <span className="tabular-nums">
            {" "}
            · Δ ass. {compareDetail.completedCur - compareDetail.completedPrev > 0 ? "+" : ""}
            {compareDetail.completedCur - compareDetail.completedPrev}
          </span>
        ) : null}
        ) — Ingressi: {compareDetail.openedCur} vs {compareDetail.openedPrev} (
        {fmtPct(deltaPct(compareDetail.openedCur, compareDetail.openedPrev))})
      </div>
    ) : null;

  return (
    <div className={`${dsSurfaceCard} p-4`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={dsSectionTitle}>Andamento lavorazioni</h2>
          <p className={dsTypoSmall}>
            Completate per mese (storico + completate in attive). Valori manuali sostituiscono il conteggio automatico.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={`${erpBtnNeutral} shrink-0 sm:text-sm`}>
          Gestisci storico
        </button>
      </div>

      {cmpLine}

      {!hasAnyData ? (
        <p className="mb-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          Nessun dato disponibile: non risultano lavorazioni completate nello storico. Usa &quot;Gestisci storico&quot; per
          inserire i dati passati.
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.55fr)]">
        <div className="min-w-0">
          <div className={`${dsTableWrap} ${dsScrollbar}`}>
            <table className="w-full min-w-[720px] border-collapse text-left text-sm text-[color:var(--cab-text)]">
              <thead className="sticky top-0 z-10 bg-[color:color-mix(in_srgb,var(--cab-surface-2)_96%,transparent)] text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)] shadow-[inset_0_-1px_0_0_var(--cab-border)] backdrop-blur-sm sm:text-xs">
                <tr className="h-14">
                  <th
                    scope="col"
                    className="min-w-[3.5rem] border-b border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] px-2 py-2 text-center align-middle tabular-nums"
                  >
                    Anno
                  </th>
                  {monthLabels.map((lab, mi) => (
                    <th
                      key={`h-${mi}-${lab}`}
                      scope="col"
                      title={lab}
                      className="min-w-[2.5rem] border-b border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] px-1 py-2 text-center align-middle"
                    >
                      {lab}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="min-w-[3.5rem] border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface-2))] px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text)]"
                  >
                    Totale
                  </th>
                  <th
                    scope="col"
                    title="Variazione percentuale rispetto all'anno precedente"
                    className="min-w-[3.5rem] border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface-2))] px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text)]"
                  >
                    Vs prec.
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const hm = heatByYear.get(row.year)!;
                  return (
                    <tr key={row.year} className={`h-12 ${dsTableRow}`}>
                      <td className="border-r border-zinc-100 bg-zinc-50/80 px-2 py-2 text-center align-middle text-sm font-semibold tabular-nums text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-50">
                        {row.year}
                      </td>
                      {row.months.map((v, mi) => {
                        const inF = cellInFilter(row.year, mi, filterRange);
                        const heat = heatClass(v, hm.rowMax);
                        const isBest = inF && hm.bestMi === mi && v > 0;
                        const isWorst = inF && hm.worstMi === mi && v > 0 && hm.worstMi !== hm.bestMi;
                        return (
                          <td
                            key={`${row.year}-${mi}`}
                            className={`border-r border-zinc-100 px-0.5 py-2 text-center align-middle text-sm tabular-nums leading-tight text-zinc-900 dark:border-zinc-800 dark:text-zinc-50 ${heat} ${
                              isBest ? "ring-1 ring-inset ring-emerald-500/50" : ""
                            } ${isWorst ? "ring-1 ring-inset ring-rose-500/45" : ""}`}
                            title={`${ymKey(row.year, mi)}: ${v}`}
                          >
                            <span className={inF ? "" : "opacity-40"}>{v > 0 ? v : "—"}</span>
                          </td>
                        );
                      })}
                      <td className="border-l border-zinc-200 bg-orange-50/40 px-2 py-2 text-center align-middle text-sm font-semibold tabular-nums text-zinc-900 dark:border-zinc-800 dark:bg-orange-950/25 dark:text-zinc-50">
                        {row.total}
                      </td>
                      <td className="border-l border-zinc-200 bg-orange-50/40 px-2 py-2 text-center align-middle text-sm font-semibold tabular-nums text-zinc-900 dark:border-zinc-800 dark:bg-orange-950/25 dark:text-zinc-50">
                        {row.growthVsPrevPct == null ? "—" : `${row.growthVsPrevPct > 0 ? "+" : ""}${row.growthVsPrevPct}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Andamento annuale e previsione</p>
          {forecast.solid.length === 0 ? (
            <p className="text-sm text-zinc-500">Nessun dato disponibile per il grafico.</p>
          ) : (
            <>
              <ReportYearlyForecastLineChart
                solid={forecast.solid}
                dashed={forecast.dashed}
                forecastYear={forecast.forecastYear}
                forecastYearEnd={forecast.forecastYearEnd}
              />
              <ul className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <span className="inline-block h-0.5 w-6 rounded-full bg-sky-500 align-middle" /> Storico annuale
                  (chiusure totali)
                </li>
                <li>
                  <span className="inline-block h-0.5 w-6 rounded-full bg-sky-500 align-middle" /> Anno in corso (YTD)
                </li>
                <li>
                  <span className="inline-block h-0.5 w-6 rounded-full bg-orange-500 align-middle" style={{ borderStyle: "dashed" }} />{" "}
                  Previsione fine anno (regressione pesata + ritmo corrente)
                </li>
              </ul>
              <p className="mt-2 text-xs text-zinc-500">
                YTD {anchor.getFullYear()}: <span className="font-semibold text-zinc-800 dark:text-zinc-100">{forecast.ytd}</span>
                {forecast.forecastYearEnd != null ? (
                  <>
                    {" "}
                    — Stima fine anno:{" "}
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100">{forecast.forecastYearEnd}</span>
                  </>
                ) : null}
              </p>
            </>
          )}
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Storico manuale lavorazioni</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Imposta il numero di <span className="font-medium">lavorazioni completate</span> per anno/mese. Il valore
              sostituisce il conteggio automatico per quel mese.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <label className="text-xs text-zinc-600 dark:text-zinc-400">
                Anno
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  value={y}
                  onChange={(e) => setY(e.target.value)}
                />
              </label>
              <label className="text-xs text-zinc-600 dark:text-zinc-400">
                Mese
                <select
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  value={m}
                  onChange={(e) => setM(e.target.value)}
                >
                  {MONTHS.map((lab, i) => (
                    <option key={lab} value={String(i + 1).padStart(2, "0")}>
                      {lab}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-zinc-600 dark:text-zinc-400">
                N° completate
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  inputMode="numeric"
                  value={n}
                  onChange={(e) => setN(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={erpBtnNeutral} onClick={() => setOpen(false)}>
                Annulla
              </button>
              <button type="button" className={erpBtnAccent} onClick={saveManual}>
                Salva
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
