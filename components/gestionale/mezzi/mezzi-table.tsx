"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { memo } from "react";
import { dsBtnIcon, dsScrollbar, dsTable, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import { hrefDocumentiPerMezzo, hrefLavorazioniPerMezzo, hrefPreventiviPerMezzo, ultimaLavorazioneLabel } from "@/lib/mezzi/mezzi-helpers";
import type { MezzoGestito, MezzoInterventoLavorazione, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";

const cellIdent =
  "px-3 py-2 align-middle font-mono text-[13px] font-medium tabular-nums leading-normal text-zinc-600 dark:text-zinc-400";

const mezzoActionBtn = `${dsBtnIcon} h-9 w-9 shrink-0 p-0`;

function IconInfo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  );
}

function IconFolderDocs({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function IconWrench({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
      />
    </svg>
  );
}

function IconClipboardList({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6" />
    </svg>
  );
}

function IconClockHistory({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function cellIdentValue(raw: string | undefined) {
  const t = raw?.trim();
  return t && t !== "—" ? t : "—";
}

function SortTh({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
}: {
  label: string;
  columnKey: MezziSortKey;
  sortColumn: MezziSortKey | null;
  sortPhase: MezziSortPhase;
  onSort: (k: MezziSortKey) => void;
}) {
  const active = sortColumn === columnKey && (sortPhase === "asc" || sortPhase === "desc");
  let icon: ReactNode = <span className="opacity-40">↕</span>;
  if (active) icon = sortPhase === "asc" ? <span>↑</span> : <span>↓</span>;
  return (
    <th className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 align-middle dark:border-zinc-700 dark:bg-zinc-800/90">
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${
          active ? "text-[color:var(--cab-primary)]" : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {label}
        {icon}
      </button>
    </th>
  );
}

export type MezziTableProps = {
  rows: MezzoGestito[];
  interventiByMezzoId: Map<string, MezzoInterventoLavorazione[]>;
  inOfficina: (m: MezzoGestito) => boolean;
  sortColumn: MezziSortKey | null;
  sortPhase: MezziSortPhase;
  onSort: (k: MezziSortKey) => void;
  flashRowId: string | null;
  onHub: (m: MezzoGestito) => void;
  onStorico: (m: MezzoGestito) => void;
};

function MezzoRowInner({
  m,
  interventi,
  inOff: _inOff,
  flash,
  onHub,
  onStorico,
}: {
  m: MezzoGestito;
  interventi: MezzoInterventoLavorazione[];
  inOff: boolean;
  flash: boolean;
  onHub: (m: MezzoGestito) => void;
  onStorico: (m: MezzoGestito) => void;
}) {
  const ultima = ultimaLavorazioneLabel(interventi);
  void _inOff;
  return (
    <tr
      id={`mezzo-row-${m.id}`}
      className={[
        dsTableRow,
        "bg-white dark:bg-zinc-900",
        flash ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] dark:bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <td className="px-3 py-2 align-middle font-medium text-zinc-900 dark:text-zinc-50">{m.marca}</td>
      <td className="min-w-0 px-3 py-2 align-middle">
        <div className="truncate font-medium text-zinc-900 dark:text-zinc-50">{cellIdentValue(m.modello)}</div>
        {m.hubSynthetic ? (
          <div className="mt-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">Sintetico</div>
        ) : null}
      </td>
      <td className={cellIdent}>{cellIdentValue(m.targa)}</td>
      <td className={cellIdent}>{cellIdentValue(m.matricola)}</td>
      <td className={cellIdent}>{cellIdentValue(m.numeroScuderia)}</td>
      <td className="min-w-0 px-3 py-2 align-middle text-zinc-800 dark:text-zinc-200">
        <div className="truncate font-medium">{m.cliente}</div>
        <div className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">{m.utilizzatore}</div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-middle text-xs text-zinc-700 dark:text-zinc-300">{ultima}</td>
      <td className="px-2 py-2 align-middle text-right">
        <div className="inline-flex max-w-[min(100vw,22rem)] flex-wrap justify-end gap-1">
          <button type="button" className={mezzoActionBtn} title="Scheda hub mezzo" aria-label="Scheda hub mezzo" onClick={() => onHub(m)}>
            <IconInfo />
          </button>
          <Link
            href={hrefDocumentiPerMezzo(m)}
            className={`${mezzoActionBtn} inline-flex items-center justify-center no-underline`}
            title="Documenti"
            aria-label="Documenti"
          >
            <IconFolderDocs />
          </Link>
          <Link
            href={hrefLavorazioniPerMezzo(m)}
            className={`${mezzoActionBtn} inline-flex items-center justify-center no-underline`}
            title="Lavorazioni"
            aria-label="Lavorazioni"
          >
            <IconWrench />
          </Link>
          <Link
            href={hrefPreventiviPerMezzo(m)}
            className={`${mezzoActionBtn} inline-flex items-center justify-center no-underline`}
            title="Preventivi"
            aria-label="Preventivi"
          >
            <IconClipboardList />
          </Link>
          <button type="button" className={mezzoActionBtn} title="Storico lavorazioni" aria-label="Storico lavorazioni" onClick={() => onStorico(m)}>
            <IconClockHistory />
          </button>
        </div>
      </td>
    </tr>
  );
}

function MezzoMobileCard({
  m,
  interventi,
  inOff: _inOff,
  flash,
  onHub,
  onStorico,
}: {
  m: MezzoGestito;
  interventi: MezzoInterventoLavorazione[];
  inOff: boolean;
  flash: boolean;
  onHub: (m: MezzoGestito) => void;
  onStorico: (m: MezzoGestito) => void;
}) {
  const ultima = ultimaLavorazioneLabel(interventi);
  void _inOff;
  return (
    <div
      id={`mezzo-row-${m.id}`}
      className={[
        "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90",
        flash ? "ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Mezzo</p>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{m.marca}</p>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{cellIdentValue(m.modello)}</p>
          {m.hubSynthetic ? (
            <p className="mt-1 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">Sintetico</p>
          ) : null}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Targa</dt>
          <dd className="font-mono text-[13px] font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{cellIdentValue(m.targa)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Matricola</dt>
          <dd className="font-mono text-[13px] font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{cellIdentValue(m.matricola)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Scuderia</dt>
          <dd className="font-mono text-[13px] font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{cellIdentValue(m.numeroScuderia)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Cliente / Utilizzatore</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{m.cliente}</dd>
          <dd className="text-xs text-zinc-600 dark:text-zinc-300">{m.utilizzatore}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Ultima lav.</dt>
          <dd className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{ultima}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" className={mezzoActionBtn} title="Scheda hub mezzo" aria-label="Scheda hub mezzo" onClick={() => onHub(m)}>
          <IconInfo />
        </button>
        <Link href={hrefDocumentiPerMezzo(m)} className={`${mezzoActionBtn} inline-flex items-center justify-center no-underline`} title="Documenti" aria-label="Documenti">
          <IconFolderDocs />
        </Link>
        <Link href={hrefLavorazioniPerMezzo(m)} className={`${mezzoActionBtn} inline-flex items-center justify-center no-underline`} title="Lavorazioni" aria-label="Lavorazioni">
          <IconWrench />
        </Link>
        <Link href={hrefPreventiviPerMezzo(m)} className={`${mezzoActionBtn} inline-flex items-center justify-center no-underline`} title="Preventivi" aria-label="Preventivi">
          <IconClipboardList />
        </Link>
        <button type="button" className={mezzoActionBtn} title="Storico lavorazioni" aria-label="Storico lavorazioni" onClick={() => onStorico(m)}>
          <IconClockHistory />
        </button>
      </div>
    </div>
  );
}

const MezzoRow = memo(MezzoRowInner);

export function MezziTable({ rows, interventiByMezzoId, inOfficina, sortColumn, sortPhase, onSort, flashRowId, onHub, onStorico }: MezziTableProps) {
  return (
    <>
      <div className={`hidden ${dsTableWrap} ${dsScrollbar} md:block`}>
        <table className={`${dsTable} min-w-[1040px] w-full table-fixed text-left text-[13px] leading-snug text-zinc-900 dark:text-zinc-100`}>
          <thead>
            <tr>
              <SortTh label="Marca" columnKey="marca" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <th className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-400">
                Modello
              </th>
              <SortTh label="Targa" columnKey="targa" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <SortTh label="Matricola" columnKey="matricola" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <th className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-400">
                Scuderia
              </th>
              <SortTh label="Cliente" columnKey="cliente" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <th className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-400">
                Ultima lav.
              </th>
              <th className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-400">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className={dsTableRow}>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  Nessun mezzo corrisponde ai criteri.
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <MezzoRow
                  key={m.id}
                  m={m}
                  interventi={interventiByMezzoId.get(m.id) ?? []}
                  inOff={inOfficina(m)}
                  flash={flashRowId === m.id}
                  onHub={onHub}
                  onStorico={onStorico}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Nessun mezzo corrisponde ai criteri.
          </p>
        ) : (
          rows.map((m) => (
            <MezzoMobileCard
              key={m.id}
              m={m}
              interventi={interventiByMezzoId.get(m.id) ?? []}
              inOff={inOfficina(m)}
              flash={flashRowId === m.id}
              onHub={onHub}
              onStorico={onStorico}
            />
          ))
        )}
      </div>
    </>
  );
}
