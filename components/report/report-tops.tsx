"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { cycleReportSort, ReportSortTh, type ReportSortPhase } from "@/components/report/report-sort-th";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import type { ReportRowCompare, TopClienteReportRow, TopMezzoReportRow, TopRicambioReportRow } from "@/lib/report/report-classifiche";
import {
  dsScrollbar,
  dsTableEmptyCell,
  dsTableTd,
  dsTableThCompare,
  dsTableThPos,
  dsTableRow,
  dsTableWrap,
} from "@/lib/ui/design-system";

const wrap = `${dsTableWrap} ${dsScrollbar}`;
const tbodyTr = dsTableRow;
const tdBase = dsTableTd;
const thPos = dsTableThPos;

function fmtCmpLine(c: ReportRowCompare | undefined): string {
  if (!c) return "—";
  const abs = c.deltaAbs > 0 ? `+${c.deltaAbs}` : String(c.deltaAbs);
  const pct =
    c.deltaPct == null
      ? "—"
      : `${c.deltaPct > 0 ? "+" : ""}${c.deltaPct.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
  return `${abs} (${pct})`;
}

function cmpCell(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""), "it");
}

type RicKey = "codice" | "nome" | "marca" | "qtaEntrata" | "qtaUscita";
type MezKey = "mezzo" | "targa" | "matricola" | "nScuderia" | "cliente" | "interventi";
type CliKey = "cliente" | "interventi" | "ultimoIso";

export function ReportTopRicambi({ rows, showCompare }: { rows: TopRicambioReportRow[]; showCompare: boolean }) {
  const [sortColumn, setSortColumn] = useState<RicKey | null>(null);
  const [sortPhase, setSortPhase] = useState<ReportSortPhase>("natural");

  const onSort = useCallback((k: RicKey) => {
    const n = cycleReportSort(sortColumn, sortPhase, k);
    setSortColumn(n.column as RicKey | null);
    setSortPhase(n.phase);
  }, [sortColumn, sortPhase]);

  const data = useMemo(() => {
    if (sortPhase === "natural" || sortColumn == null) return [...rows];
    const c = [...rows];
    c.sort((a, b) => {
      const va = a[sortColumn];
      const vb = b[sortColumn];
      const m = cmpCell(va, vb);
      const p = sortPhase === "asc" ? m : -m;
      if (p !== 0) return p;
      return a.rank - b.rank;
    });
    return c;
  }, [rows, sortColumn, sortPhase]);

  const pageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(data.length, pageSize);
  useEffect(() => {
    resetPage();
  }, [rows, sortColumn, sortPhase, pageSize, resetPage]);
  const paged = useMemo(() => sliceItems(data), [data, sliceItems, page]);

  const colSpan = showCompare ? 7 : 6;

  return (
    <div className={wrap}>
      <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-left text-sm">
        <colgroup>
          <col className="w-6 min-w-[1.5rem] max-w-[1.75rem]" />
          <col style={{ width: "13%" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "11%" }} />
          {showCompare ? <col style={{ width: "20%" }} /> : null}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={thPos}>
              #
            </th>
            <ReportSortTh label="Codice" columnKey="codice" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
            <ReportSortTh label="Ricambio" columnKey="nome" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
            <ReportSortTh label="Marca" columnKey="marca" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
            <ReportSortTh label="Entrata" columnKey="qtaEntrata" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} align="right" />
            <ReportSortTh label="Uscita" columnKey="qtaUscita" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} align="right" />
            {showCompare ? (
              <th scope="col" className={dsTableThCompare}>
                Δ vs confronto
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className={dsTableEmptyCell}>
                Nessun dato disponibile nel periodo selezionato.
              </td>
            </tr>
          ) : (
            paged.map((r) => (
              <tr key={r.id} className={tbodyTr}>
                <td className={`${tdBase} px-1.5 text-center text-xs tabular-nums text-[color:var(--cab-text-muted)]`}>{r.rank}</td>
                <td className={`${tdBase} whitespace-nowrap font-mono text-xs text-[color:var(--cab-text)]`}>{r.codice}</td>
                <td className={`${tdBase} min-w-0`}>
                  <Link href="/magazzino" className="line-clamp-2 font-medium text-[color:var(--cab-primary)] hover:underline">
                    {r.nome}
                  </Link>
                </td>
                <td className={`${tdBase} max-w-0 truncate text-xs`} title={r.marca}>
                  {r.marca}
                </td>
                <td className={`${tdBase} text-right tabular-nums`}>{r.qtaEntrata}</td>
                <td className={`${tdBase} text-right tabular-nums font-medium`}>{r.qtaUscita}</td>
                {showCompare ? (
                  <td className={`${tdBase} text-right text-xs tabular-nums text-[color:color-mix(in_srgb,var(--cab-text-muted)_92%,var(--cab-text))]`}>{fmtCmpLine(r.compare)}</td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
    </div>
  );
}

export function ReportTopMezzi({ rows, showCompare }: { rows: TopMezzoReportRow[]; showCompare: boolean }) {
  const [sortColumn, setSortColumn] = useState<MezKey | null>(null);
  const [sortPhase, setSortPhase] = useState<ReportSortPhase>("natural");

  const onSort = useCallback(
    (k: MezKey) => {
      const n = cycleReportSort(sortColumn, sortPhase, k);
      setSortColumn(n.column as MezKey | null);
      setSortPhase(n.phase);
    },
    [sortColumn, sortPhase],
  );

  const data = useMemo(() => {
    if (sortPhase === "natural" || sortColumn == null) return [...rows];
    const c = [...rows];
    c.sort((a, b) => {
      const va = a[sortColumn];
      const vb = b[sortColumn];
      const m = cmpCell(va, vb);
      const p = sortPhase === "asc" ? m : -m;
      if (p !== 0) return p;
      return a.rank - b.rank;
    });
    return c;
  }, [rows, sortColumn, sortPhase]);

  const pageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(data.length, pageSize);
  useEffect(() => {
    resetPage();
  }, [rows, sortColumn, sortPhase, pageSize, resetPage]);
  const paged = useMemo(() => sliceItems(data), [data, sliceItems, page]);

  const colSpan = showCompare ? 8 : 7;

  return (
    <div className={wrap}>
      <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-left text-sm">
        <colgroup>
          <col className="w-6 min-w-[1.5rem] max-w-[1.75rem]" />
          <col style={{ width: "18%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "10%" }} />
          {showCompare ? <col style={{ width: "19%" }} /> : null}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={thPos}>
              #
            </th>
            <ReportSortTh label="Mezzo" columnKey="mezzo" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
            <ReportSortTh label="Targa" columnKey="targa" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
            <ReportSortTh label="Matricola" columnKey="matricola" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
            <ReportSortTh
              label="N. scuderia"
              columnKey="nScuderia"
              sortColumn={sortColumn}
              sortPhase={sortPhase}
              onSort={onSort}
            />
            <ReportSortTh label="Cliente" columnKey="cliente" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
            <ReportSortTh label="N° lav." columnKey="interventi" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} align="right" />
            {showCompare ? (
              <th scope="col" className={dsTableThCompare}>
                Δ vs confronto
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className={dsTableEmptyCell}>
                Nessun dato disponibile nel periodo selezionato.
              </td>
            </tr>
          ) : (
            paged.map((r) => (
              <tr key={r.id} className={tbodyTr}>
                <td className={`${tdBase} px-0.5 text-center text-[10px] tabular-nums text-[color:var(--cab-text-muted)]`}>{r.rank}</td>
                <td className={`${tdBase} min-w-0`}>
                  <Link href="/mezzi" className="line-clamp-2 font-medium text-[color:var(--cab-primary)] hover:underline">
                    {r.mezzo}
                  </Link>
                </td>
                <td className={`${tdBase} whitespace-nowrap font-mono text-xs`}>{r.targa}</td>
                <td className={`${tdBase} whitespace-nowrap font-mono text-xs`}>{r.matricola}</td>
                <td className={`${tdBase} max-w-0 truncate text-xs`} title={r.nScuderia}>
                  {r.nScuderia}
                </td>
                <td className={`${tdBase} min-w-0 truncate text-xs`} title={r.cliente}>
                  {r.cliente}
                </td>
                <td className={`${tdBase} text-right tabular-nums font-medium`}>{r.interventi}</td>
                {showCompare ? (
                  <td className={`${tdBase} text-right text-xs tabular-nums text-[color:color-mix(in_srgb,var(--cab-text-muted)_92%,var(--cab-text))]`}>{fmtCmpLine(r.compare)}</td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
    </div>
  );
}

export function ReportTopClienti({ rows, showCompare }: { rows: TopClienteReportRow[]; showCompare: boolean }) {
  const [sortColumn, setSortColumn] = useState<CliKey | null>(null);
  const [sortPhase, setSortPhase] = useState<ReportSortPhase>("natural");

  const onSort = useCallback(
    (k: CliKey) => {
      const n = cycleReportSort(sortColumn, sortPhase, k);
      setSortColumn(n.column as CliKey | null);
      setSortPhase(n.phase);
    },
    [sortColumn, sortPhase],
  );

  const data = useMemo(() => {
    if (sortPhase === "natural" || sortColumn == null) return [...rows];
    const c = [...rows];
    c.sort((a, b) => {
      const va = a[sortColumn];
      const vb = b[sortColumn];
      const m = cmpCell(va, vb);
      const p = sortPhase === "asc" ? m : -m;
      if (p !== 0) return p;
      return a.rank - b.rank;
    });
    return c;
  }, [rows, sortColumn, sortPhase]);

  const pageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(data.length, pageSize);
  useEffect(() => {
    resetPage();
  }, [rows, sortColumn, sortPhase, pageSize, resetPage]);
  const paged = useMemo(() => sliceItems(data), [data, sliceItems, page]);

  const colSpan = showCompare ? 5 : 4;

  return (
    <div className={wrap}>
      <table className="w-full min-w-[520px] table-fixed border-separate border-spacing-0 text-left text-sm">
        <colgroup>
          <col className="w-6 min-w-[1.5rem] max-w-[1.75rem]" />
          <col style={{ width: "38%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "20%" }} />
          {showCompare ? <col style={{ width: "26%" }} /> : null}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={thPos}>
              #
            </th>
            <ReportSortTh label="Cliente" columnKey="cliente" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
            <ReportSortTh label="N° interventi" columnKey="interventi" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} align="right" />
            <ReportSortTh label="Ultimo" columnKey="ultimoIso" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} align="right" />
            {showCompare ? (
              <th scope="col" className={dsTableThCompare}>
                Δ vs confronto
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className={dsTableEmptyCell}>
                Nessun dato disponibile nel periodo selezionato.
              </td>
            </tr>
          ) : (
            paged.map((r) => (
              <tr key={r.cliente} className={tbodyTr}>
                <td className={`${tdBase} px-1.5 text-center text-xs tabular-nums text-[color:var(--cab-text-muted)]`}>{r.rank}</td>
                <td className={`${tdBase} min-w-0 font-medium`}>
                  <span className="line-clamp-2" title={r.cliente}>
                    {r.cliente}
                  </span>
                </td>
                <td className={`${tdBase} text-right tabular-nums`}>{r.interventi}</td>
                <td className={`${tdBase} whitespace-nowrap text-right text-xs tabular-nums text-[color:color-mix(in_srgb,var(--cab-text-muted)_92%,var(--cab-text))]`}>
                  {r.ultimoIso ? new Date(r.ultimoIso).toLocaleDateString("it-IT") : "—"}
                </td>
                {showCompare ? (
                  <td className={`${tdBase} text-right text-xs tabular-nums text-[color:color-mix(in_srgb,var(--cab-text-muted)_92%,var(--cab-text))]`}>{fmtCmpLine(r.compare)}</td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
    </div>
  );
}
