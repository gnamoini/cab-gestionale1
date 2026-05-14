"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  erpBtnAccent,
  erpBtnNeutral,
  erpBtnSoftOrange,
  erpFocus,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  GestionaleLogChangeList,
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  buildMezziGestionaleLogViewModel,
} from "@/components/gestionale/gestionale-log-ui";
import { formatDocumentoRigaSintetica, getDocumentApriHref } from "@/components/gestionale/documenti/documenti-helpers";
import { buildPreventiviArchivioFilterHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { openPreventivoPdfInNewTab } from "@/lib/preventivi/preventivi-pdf";
import { Q_PREVENTIVI_OPEN } from "@/lib/preventivi/preventivi-query";
import {
  hrefDocumentiPerMezzo,
  hrefLavorazioniPerMezzo,
  hrefPreventiviPerMezzo,
  ultimaLavorazioneLabel,
} from "@/lib/mezzi/mezzi-helpers";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { useMezzoHub } from "@/src/hooks/gestionale/use-mezzo-hub";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { dsScrollbar, dsTable, dsTableHeadCell, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";

type TabId = "panoramica" | "lavorazioni" | "timeline" | "preventivi" | "documenti" | "log";

function fmtDt(iso: string) {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function MezziHubDetailModal({
  mezzo,
  onClose,
  onEdit,
  onOpenStoricoLavorazioni,
}: {
  mezzo: MezzoGestito;
  onClose: () => void;
  onEdit: () => void;
  onOpenStoricoLavorazioni: () => void;
}) {
  const [tab, setTab] = useState<TabId>("panoramica");

  const hubQuery = useMezzoHub(mezzo.id);
  const hubData = hubQuery.data;
  const interventi = hubData?.interventi ?? [];
  const preventivi = hubData?.preventivi ?? [];
  const documenti = hubData?.documenti ?? [];
  const hubLogEntries = hubData?.log ?? [];
  const timeline = hubData?.timeline ?? [];

  const nPv = hubData?.preventivi.length ?? 0;
  const nDoc = hubData?.documenti.length ?? 0;
  const nTimeline = hubData?.timeline.length ?? 0;

  const sortedLav = useMemo(() => {
    const rows = [...interventi];
    rows.sort((a, b) => new Date(b.dataIngresso).getTime() - new Date(a.dataIngresso).getTime());
    return rows;
  }, [interventi]);

  const sortedPv = useMemo(() => {
    const rows = [...preventivi];
    rows.sort((a, b) => new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime());
    return rows;
  }, [preventivi]);

  const listPageSize = useResponsiveListPageSize();

  const {
    page: lavPage,
    setPage: setLavPage,
    pageCount: lavPageCount,
    sliceItems: sliceLav,
    showPager: showLavPager,
    label: lavPagerLabel,
    resetPage: resetLavPage,
  } = useClientPagination(sortedLav.length, listPageSize);
  useEffect(() => {
    resetLavPage();
  }, [mezzo.id, sortedLav.length, listPageSize, resetLavPage]);
  const pagedLav = useMemo(() => sliceLav(sortedLav), [sortedLav, sliceLav, lavPage]);

  const {
    page: pvPage,
    setPage: setPvPage,
    pageCount: pvPageCount,
    sliceItems: slicePv,
    showPager: showPvPager,
    label: pvPagerLabel,
    resetPage: resetPvPage,
  } = useClientPagination(sortedPv.length, listPageSize);
  useEffect(() => {
    resetPvPage();
  }, [mezzo.id, sortedPv.length, listPageSize, resetPvPage]);
  const pagedPv = useMemo(() => slicePv(sortedPv), [sortedPv, slicePv, pvPage]);

  const {
    page: docPage,
    setPage: setDocPage,
    pageCount: docPageCount,
    sliceItems: sliceDoc,
    showPager: showDocPager,
    label: docPagerLabel,
    resetPage: resetDocPage,
  } = useClientPagination(documenti.length, listPageSize);
  useEffect(() => {
    resetDocPage();
  }, [mezzo.id, documenti.length, listPageSize, resetDocPage]);
  const pagedDoc = useMemo(() => sliceDoc(documenti), [documenti, sliceDoc, docPage]);

  const {
    page: hubLogPage,
    setPage: setHubLogPage,
    pageCount: hubLogPageCount,
    sliceItems: sliceHubLog,
    showPager: showHubLogPager,
    label: hubLogPagerLabel,
    resetPage: resetHubLogPage,
  } = useClientPagination(hubLogEntries.length, listPageSize);
  useEffect(() => {
    resetHubLogPage();
  }, [mezzo.id, hubLogEntries.length, listPageSize, resetHubLogPage]);
  const pagedHubLog = useMemo(() => sliceHubLog(hubLogEntries), [hubLogEntries, sliceHubLog, hubLogPage]);

  const {
    page: tlPage,
    setPage: setTlPage,
    pageCount: tlPageCount,
    sliceItems: sliceTl,
    showPager: showTlPager,
    label: tlPagerLabel,
    resetPage: resetTlPage,
  } = useClientPagination(timeline.length, listPageSize);
  useEffect(() => {
    resetTlPage();
  }, [mezzo.id, timeline.length, listPageSize, resetTlPage]);
  const pagedTimeline = useMemo(() => sliceTl(timeline), [timeline, sliceTl, tlPage]);

  const tabBtn = (id: TabId, label: string) => {
    const on = tab === id;
    return (
      <button
        type="button"
        key={id}
        onClick={() => setTab(id)}
        className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${on ? "border-orange-400/70 bg-orange-500/15 text-orange-900 dark:text-orange-100" : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"} ${erpFocus}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(92vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mezzi-hub-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id="mezzi-hub-title" className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {mezzo.marca} {mezzo.modello !== "—" ? mezzo.modello : ""}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {mezzo.targa?.trim() && mezzo.targa !== "—" ? `${mezzo.targa} · ` : ""}
              {mezzo.matricola?.trim() && mezzo.matricola !== "—" ? `${mezzo.matricola}` : ""}
              {mezzo.numeroScuderia?.trim() ? ` · sc. ${mezzo.numeroScuderia}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              className={erpBtnSoftOrange}
              onClick={onEdit}
              disabled={Boolean(mezzo.hubSynthetic)}
              title={mezzo.hubSynthetic ? "Registra il mezzo in anagrafica per abilitare la modifica" : undefined}
            >
              Modifica
            </button>
            <button type="button" className={erpBtnNeutral} onClick={onClose}>
              Chiudi
            </button>
          </div>
        </div>

        {hubQuery.isError ? (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {hubQuery.error?.message ?? "Errore caricamento hub mezzo."}
          </div>
        ) : null}

        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-zinc-100 bg-zinc-50/50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/80">
          {tabBtn("panoramica", "Panoramica")}
          {tabBtn("lavorazioni", `Lavorazioni (${interventi.length})`)}
          {tabBtn("timeline", `Timeline (${nTimeline})`)}
          {tabBtn("preventivi", `Preventivi (${nPv})`)}
          {tabBtn("documenti", `Documenti (${nDoc})`)}
          {tabBtn("log", `Log (${hubLogEntries.length})`)}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {hubQuery.isLoading && !hubData ? (
            <p className="text-sm text-zinc-500">Caricamento dati mezzo…</p>
          ) : null}
          {tab === "panoramica" ? (
            <div className="space-y-4 text-sm">
              {mezzo.hubSynthetic ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  Riga sintetica: crea il mezzo in anagrafica con gli stessi identificativi (targa / matricola) per unificare il parco e abilitare la modifica.
                </p>
              ) : null}
              {hubData ? (
                <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-950/40 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-zinc-500">Lavorazioni</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{hubData.kpi.totaleLavorazioni}</p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-zinc-500">Lavorazione attiva</p>
                    <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-50">{hubData.kpi.lavorazioneAttiva ? "Sì" : "No"}</p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-zinc-500">Preventivi</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{hubData.kpi.preventiviCount}</p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-zinc-500">Documenti</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{hubData.kpi.documentiCount}</p>
                  </div>
                </div>
              ) : null}
              <dl className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <dt className="text-[10px] font-bold uppercase text-zinc-500">Cliente</dt>
                  <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{mezzo.cliente}</dd>
                </div>
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <dt className="text-[10px] font-bold uppercase text-zinc-500">Ultima lavorazione</dt>
                  <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{ultimaLavorazioneLabel(interventi)}</dd>
                </div>
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <dt className="text-[10px] font-bold uppercase text-zinc-500">Utilizzatore</dt>
                  <dd className="mt-1 text-zinc-800 dark:text-zinc-200">{mezzo.utilizzatore}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Link href={hrefDocumentiPerMezzo(mezzo)} className={`${erpBtnNeutral} inline-flex no-underline`} onClick={onClose}>
                  Apri documenti filtrati
                </Link>
                <Link href={hrefLavorazioniPerMezzo(mezzo)} className={`${erpBtnNeutral} inline-flex no-underline`} onClick={onClose}>
                  Vai a lavorazioni
                </Link>
                <Link href={hrefPreventiviPerMezzo(mezzo)} className={`${erpBtnNeutral} inline-flex no-underline`} onClick={onClose}>
                  Vai a preventivi
                </Link>
                <button type="button" className={erpBtnSoftOrange} onClick={onOpenStoricoLavorazioni}>
                  Timeline lavorazioni
                </button>
              </div>
            </div>
          ) : null}

          {tab === "lavorazioni" ? (
            <div className={`${dsTableWrap} ${dsScrollbar}`}>
              <table className={`${dsTable} min-w-[640px] text-xs`}>
                <thead>
                  <tr>
                    <th className={dsTableHeadCell}>Ingresso</th>
                    <th className={dsTableHeadCell}>Stato</th>
                    <th className={dsTableHeadCell}>Note</th>
                    <th className={dsTableHeadCell}> </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLav.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-6 text-center text-[color:var(--cab-text-muted)]">
                        Nessuna lavorazione collegata.
                      </td>
                    </tr>
                  ) : (
                    pagedLav.map((r) => (
                      <tr key={r.id} className={dsTableRow}>
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px]">{fmtDt(r.dataIngresso)}</td>
                        <td className="px-2 py-2">{r.statoFinale}</td>
                        <td className="max-w-[280px] px-2 py-2 text-zinc-600 dark:text-zinc-400">{r.descrizione}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-right">
                          <Link
                            href={buildPreventiviArchivioFilterHref(r.id, r.origine === "attiva" ? "attiva" : "storico")}
                            className="text-[color:var(--cab-primary)] underline-offset-2 hover:underline"
                            onClick={onClose}
                          >
                            Preventivi
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {showLavPager ? (
                <TablePagination page={lavPage} pageCount={lavPageCount} onPageChange={setLavPage} label={lavPagerLabel} />
              ) : null}
            </div>
          ) : null}

          {tab === "timeline" ? (
            <>
              {pagedTimeline.length === 0 ? (
                <p className="text-sm text-zinc-500">Nessun evento in timeline.</p>
              ) : (
                <ul className="space-y-2">
                  {pagedTimeline.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex flex-col gap-1 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40"
                    >
                      <p className="text-[11px] font-mono text-zinc-500">{fmtDt(ev.at)}</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{ev.title}</p>
                      {ev.subtitle ? <p className="text-xs text-zinc-600 dark:text-zinc-400">{ev.subtitle}</p> : null}
                      {ev.ref?.lavorazioneId && ev.ref.origine ? (
                        <Link
                          href={buildPreventiviArchivioFilterHref(ev.ref.lavorazioneId, ev.ref.origine)}
                          className="text-xs font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-300"
                          onClick={onClose}
                        >
                          Preventivi collegati
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {showTlPager ? (
                <TablePagination page={tlPage} pageCount={tlPageCount} onPageChange={setTlPage} label={tlPagerLabel} />
              ) : null}
            </>
          ) : null}

          {tab === "preventivi" ? (
            <>
            <ul className="space-y-2">
              {sortedPv.length === 0 ? (
                <li className="text-sm text-zinc-500">Nessun preventivo collegato.</li>
              ) : (
                pagedPv.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {p.numero} · {fmtDt(p.dataCreazione)}
                      </p>
                      <p className="text-xs text-zinc-500">{p.cliente}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
                      <button
                        type="button"
                        className={erpBtnNeutral}
                        onClick={() => {
                          const sp = new URLSearchParams();
                          sp.set(Q_PREVENTIVI_OPEN, p.id);
                          openUrlInNewTab(`/preventivi?${sp.toString()}`);
                        }}
                      >
                        Dettaglio
                      </button>
                      <button type="button" className={erpBtnSoftOrange} onClick={() => openPreventivoPdfInNewTab(p, "Gestionale")}>
                        PDF
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
            {showPvPager ? <TablePagination page={pvPage} pageCount={pvPageCount} onPageChange={setPvPage} label={pvPagerLabel} /> : null}
            </>
          ) : null}

          {tab === "documenti" ? (
            <>
            <ul className="space-y-2">
              {documenti.length === 0 ? (
                <li className="text-sm text-zinc-500">Nessun documento collegato a questo mezzo.</li>
              ) : (
                pagedDoc.map((d) => {
                  const href = getDocumentApriHref(d);
                  return (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase text-zinc-500">{formatDocumentoRigaSintetica(d)}</p>
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{d.nome}</p>
                      </div>
                      {href ? (
                        <button
                          type="button"
                          className={`${erpBtnNeutral} shrink-0`}
                          onClick={() =>
                            openUrlInNewTab(href, { revokeBlobUrlAfterMs: href.startsWith("blob:") ? 120_000 : undefined })
                          }
                        >
                          Apri
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
            {showDocPager ? <TablePagination page={docPage} pageCount={docPageCount} onPageChange={setDocPage} label={docPagerLabel} /> : null}
            </>
          ) : null}

          {tab === "log" ? (
            hubQuery.isLoading && !hubData ? (
              <p className="text-sm text-zinc-500">Caricamento log…</p>
            ) : hubLogEntries.length === 0 ? (
              <GestionaleLogEmpty message="Nessuna modifica anagrafica registrata per questo mezzo." />
            ) : (
              <>
                <GestionaleLogList>
                  {pagedHubLog.map((e) => {
                  const vm = buildMezziGestionaleLogViewModel({
                    tipo: e.tipo,
                    mezzo: e.mezzo,
                    riepilogo: e.riepilogo,
                    autore: e.autore,
                    at: e.at,
                    changes: e.changes,
                  });
                  return (
                    <li key={e.id}>
                      <GestionaleLogEntryFourLines vm={vm}>
                        <GestionaleLogChangeList changes={e.changes} compact />
                      </GestionaleLogEntryFourLines>
                    </li>
                  );
                })}
                </GestionaleLogList>
                {showHubLogPager ? (
                  <TablePagination page={hubLogPage} pageCount={hubLogPageCount} onPageChange={setHubLogPage} label={hubLogPagerLabel} />
                ) : null}
              </>
            )
          ) : null}
        </div>

        <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
          <Link href={hrefDocumentiPerMezzo(mezzo)} className={`${erpBtnAccent} inline-flex w-full justify-center no-underline sm:w-auto`} onClick={onClose}>
            Documenti (pagina completa)
          </Link>
        </div>
      </div>
    </div>
  );
}
