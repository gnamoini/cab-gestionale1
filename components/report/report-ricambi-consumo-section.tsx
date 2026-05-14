"use client";

import { useEffect, useMemo, useState } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import {
  buildRicambiConsumoRanking,
  buildConsumoMapMagazzinoRolling36ForProducts,
  formatAvgMonthlyMagazzinoIt,
  intersectDateRanges,
  monthBoundsLocal,
  yearBoundsLocal,
} from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { DateRange } from "@/lib/report/date-ranges";
import { rangeToYmKeys } from "@/lib/report/magazzino-monthly-rows";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
  dsTable,
  dsTableHead,
  dsTableRow,
  dsTableWrap,
  gestionaleSelectNativePlainClass,
} from "@/lib/ui/design-system";

type VistaMode = "periodo" | "mese" | "anno";

function parseYm(k: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(k);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) };
}

function fmtYmHuman(k: string): string {
  const p = parseYm(k);
  if (!p) return k;
  return new Date(p.y, p.m - 1, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function fmtRangeLine(r: DateRange): string {
  const o = { day: "2-digit" as const, month: "short" as const, year: "numeric" as const };
  return `${r.start.toLocaleDateString("it-IT", o)} — ${r.end.toLocaleDateString("it-IT", o)}`;
}

function yearsInRange(r: DateRange): number[] {
  const y0 = r.start.getFullYear();
  const y1 = r.end.getFullYear();
  const out: number[] = [];
  for (let y = y0; y <= y1; y++) out.push(y);
  return out;
}

function ReportConsumoBarChart({
  rows,
}: {
  rows: { key: string; label: string; value: number; avgStr: string; total: number }[];
}) {
  const maxV = useMemo(() => Math.max(1e-9, ...rows.map((x) => x.value)), [rows]);
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Nessun dato nel periodo selezionato.</p>;
  }
  return (
    <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Top 10 — consumo medio (Magazzino, rolling 36 mesi)
        </p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
          Ordine per consumo medio nel periodo. Passa il mouse sulla riga per codice, media e uscite nel periodo.
        </p>
      </div>
      <ul className="space-y-2.5" aria-label="Grafico a barre consumo ricambi">
        {rows.map((r, i) => {
          const tip = `${r.label}\nConsumo medio (36m): ${r.avgStr}\nUscite nel periodo: ${r.total.toLocaleString("it-IT")}`;
          return (
            <li key={r.key}>
              <div
                className="rounded-xl border border-zinc-100 bg-white/80 px-3 py-2.5 transition-[border-color,background-color] duration-150 hover:border-zinc-200 hover:bg-white dark:border-zinc-800/90 dark:bg-zinc-900/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/80"
                title={tip}
              >
                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-xs font-bold tabular-nums text-orange-900 dark:text-orange-100"
                    aria-label={`Posizione ${i + 1}`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 basis-full sm:basis-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{r.label}</p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-orange-500/85 transition-[width] duration-500 ease-out dark:bg-orange-500/75"
                        style={{ width: `${Math.min(100, (r.value / maxV) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex w-full shrink-0 justify-between gap-4 sm:w-auto sm:flex-col sm:items-end sm:justify-center sm:gap-0.5 sm:text-right">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Medio / mese</p>
                      <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{r.avgStr}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Uscite</p>
                      <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-300">{r.total.toLocaleString("it-IT")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ReportRicambiConsumoSection({
  magLog,
  prodotti,
  filterRange,
  anchor,
}: {
  magLog: MagazzinoChangeLogEntry[];
  prodotti: RicambioMagazzino[];
  filterRange: DateRange;
  anchor: Date;
}) {
  const monthKeys = useMemo(() => rangeToYmKeys(filterRange), [filterRange]);
  const years = useMemo(() => yearsInRange(filterRange), [filterRange]);

  const [vista, setVista] = useState<VistaMode>("periodo");
  const [selMonthKey, setSelMonthKey] = useState<string>("");
  const [selYear, setSelYear] = useState(() => filterRange.end.getFullYear());

  useEffect(() => {
    if (monthKeys.length > 0) {
      setSelMonthKey((cur) => (cur && monthKeys.includes(cur) ? cur : monthKeys[monthKeys.length - 1]!));
    } else {
      setSelMonthKey("");
    }
  }, [monthKeys]);

  useEffect(() => {
    const y = filterRange.end.getFullYear();
    setSelYear((cur) => {
      if (years.length === 0) return y;
      if (years.includes(cur)) return cur;
      if (years.includes(y)) return y;
      return years[years.length - 1]!;
    });
  }, [filterRange, years]);

  const effectiveRange = useMemo((): DateRange => {
    if (vista === "periodo") return filterRange;
    if (vista === "mese") {
      const p = parseYm(selMonthKey);
      if (!p) return filterRange;
      const mBound = monthBoundsLocal(p.y, p.m);
      return intersectDateRanges(filterRange, mBound) ?? filterRange;
    }
    const yBound = yearBoundsLocal(selYear);
    return intersectDateRanges(filterRange, yBound) ?? filterRange;
  }, [vista, filterRange, selMonthKey, selYear]);

  const ranking = useMemo(
    () => buildRicambiConsumoRanking(magLog, prodotti, effectiveRange, { limit: 200 }),
    [magLog, prodotti, effectiveRange],
  );

  const listPageSize = useResponsiveListPageSize();
  const rankingPagerDeps = useMemo(
    () =>
      `${effectiveRange.start.getTime()}|${effectiveRange.end.getTime()}|${vista}|${selMonthKey}|${selYear}|${ranking.length}`,
    [effectiveRange.start, effectiveRange.end, vista, selMonthKey, selYear, ranking.length],
  );
  const {
    page: rankingPage,
    setPage: setRankingPage,
    pageCount: rankingPageCount,
    sliceItems: sliceRankingPage,
    showPager: showRankingPager,
    label: rankingPagerLabel,
    resetPage: resetRankingPage,
  } = useClientPagination(ranking.length, listPageSize);
  useEffect(() => {
    resetRankingPage();
  }, [rankingPagerDeps, listPageSize, resetRankingPage]);
  const rankingPaged = useMemo(() => sliceRankingPage(ranking), [ranking, sliceRankingPage]);

  const rollingConsumoMap = useMemo(
    () => buildConsumoMapMagazzinoRolling36ForProducts(magLog, prodotti, anchor),
    [magLog, prodotti, anchor],
  );

  const chartRows = useMemo(() => {
    const rows = ranking.map((r) => {
      const official = rollingConsumoMap.get(r.id)?.avgMonthly ?? null;
      return {
        key: r.id,
        label: `${r.codice} · ${r.nome}`,
        value: official ?? 0,
        avgStr: formatAvgMonthlyMagazzinoIt(official),
        total: r.totalUscite,
      };
    });
    rows.sort((a, b) => b.value - a.value || b.total - a.total);
    return rows.slice(0, 10);
  }, [ranking, rollingConsumoMap]);

  const hasLog = magLog.length > 0;

  return (
    <ShellCard
      title="Ricambi a maggior consumo"
      subtitle="Consumo medio mensile: stesso indicatore della pagina Magazzino (ultimi 36 mesi, 2 decimali). «Tot. uscito» e la classifica per posizione si riferiscono alle uscite nel periodo / vista selezionata."
    >
      <p className="mb-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        Periodo del report: <span className="font-medium text-zinc-800 dark:text-zinc-200">{fmtRangeLine(filterRange)}</span>.
        Con le viste «Per mese» o «Per anno» la colonna uscite si limita al sotto-intervallo scelto (sempre contenuto nel filtro globale). Vista
        attiva: <span className="font-medium text-zinc-800 dark:text-zinc-200">{fmtRangeLine(effectiveRange)}</span>.
      </p>
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Aggregazione</span>
          <div className={dsSegmentedWrap}>
            {(
              [
                ["periodo", "Intero periodo filtro"],
                ["mese", "Per mese"],
                ["anno", "Per anno"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setVista(id)}
                className={vista === id ? dsSegmentedBtnOn : dsSegmentedBtnOff}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {vista === "mese" ? (
          <div className="w-full min-w-[12rem] lg:w-auto">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mese (nel periodo)</label>
            <select
              value={selMonthKey}
              onChange={(e) => setSelMonthKey(e.target.value)}
              className={`${gestionaleSelectNativePlainClass} mt-1 block h-10 w-full py-0`}
              disabled={monthKeys.length === 0}
            >
              {monthKeys.map((k) => (
                <option key={k} value={k}>
                  {fmtYmHuman(k)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {vista === "anno" ? (
          <div className="w-full min-w-[8rem] lg:w-auto">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Anno (nel periodo)</label>
            <select
              value={String(selYear)}
              onChange={(e) => setSelYear(Number(e.target.value))}
              className={`${gestionaleSelectNativePlainClass} mt-1 block h-10 w-full py-0`}
              disabled={years.length === 0}
            >
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {!hasLog ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
          Dati insufficienti: non è presente uno storico movimenti magazzino. I consumi si popolano quando registrate
          variazioni di scorta nei log.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start">
            <div className="min-w-0">
              <ReportConsumoBarChart rows={chartRows} />
            </div>
            <div className="min-w-0 lg:pt-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Classifica consumo
              </p>
              <div className={dsTableWrap}>
                <table className={`${dsTable} w-full min-w-[640px] table-fixed text-[13px] text-zinc-900 dark:text-zinc-100`}>
                  <colgroup>
                    <col className="w-[3.5rem]" />
                    <col className="w-[7.5rem]" />
                    <col />
                    <col className="w-[7rem]" />
                    <col className="w-[7.5rem]" />
                    <col className="w-[5.5rem]" />
                  </colgroup>
                  <thead className={`border-b border-zinc-100 dark:border-zinc-800 ${dsTableHead}`}>
                    <tr>
                      <th className="px-2 py-2.5 align-middle">Pos</th>
                      <th className="px-2 py-2.5 align-middle">Codice</th>
                      <th className="px-2 py-2.5 align-middle">Ricambio</th>
                      <th className="px-2 py-2.5 align-middle">Marca</th>
                      <th className="px-2 py-2.5 text-right align-middle">Cons. medio (36m)</th>
                      <th className="px-2 py-2.5 text-right align-middle">Tot. uscito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.length === 0 ? (
                      <tr className={dsTableRow}>
                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                          Nessuno scarico nel periodo selezionato.
                        </td>
                      </tr>
                    ) : (
                      rankingPaged.map((r) => (
                        <tr key={r.id} className={dsTableRow}>
                          <td className="px-2 py-2 align-middle font-mono text-xs tabular-nums text-zinc-500">#{r.rank}</td>
                          <td className="px-2 py-2 align-middle">
                            <span className="inline-block max-w-full whitespace-nowrap font-mono text-[12px] font-semibold tracking-wide">
                              {r.codice}
                            </span>
                          </td>
                          <td className="min-w-0 px-2 py-2 align-middle">
                            <div className="truncate font-medium" title={r.nome}>
                              {r.nome}
                            </div>
                          </td>
                          <td className="min-w-0 px-2 py-2 align-middle">
                            <div className="truncate text-zinc-700 dark:text-zinc-300" title={r.marca}>
                              {r.marca}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right align-middle font-semibold tabular-nums">
                            {formatAvgMonthlyMagazzinoIt(rollingConsumoMap.get(r.id)?.avgMonthly ?? null)}
                          </td>
                          <td className="px-2 py-2 text-right align-middle tabular-nums text-zinc-700 dark:text-zinc-300">
                            {r.totalUscite.toLocaleString("it-IT")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {showRankingPager ? (
                <TablePagination
                  page={rankingPage}
                  pageCount={rankingPageCount}
                  onPageChange={setRankingPage}
                  label={rankingPagerLabel}
                  className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50/50 px-2 dark:border-zinc-800 dark:bg-zinc-900/30"
                />
              ) : null}
            </div>
          </div>
        </>
      )}
    </ShellCard>
  );
}
