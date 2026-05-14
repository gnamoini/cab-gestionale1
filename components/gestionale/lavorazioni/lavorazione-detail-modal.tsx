"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { formatDocumentoRigaSintetica, getDocumentApriHref } from "@/components/gestionale/documenti/documenti-helpers";
import { GestionaleLogEmpty, GestionaleLogList } from "@/components/gestionale/gestionale-log-ui";
import { isStatoLavorazioneChiusoDb } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { buildPreventiviArchivioFilterHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { openPreventivoPdfInNewTab } from "@/lib/preventivi/preventivi-pdf";
import { Q_PREVENTIVI_OPEN } from "@/lib/preventivi/preventivi-query";
import { documentoRowToGestionale, preventivoRowToRecordStub } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { dsScrollbar, dsTable, dsTableHeadCell, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import { useLavorazioneHub } from "@/src/hooks/gestionale/use-lavorazione-hub";
import {
  erpBtnNeutral,
  erpBtnSoftOrange,
  erpFocus,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";

type TabId = "panoramica" | "schede" | "movimenti" | "preventivi" | "documenti" | "log" | "timeline";

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

function fmtDay(iso: string | null | undefined) {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

export function LavorazioneDetailModal({ lavorazioneId, onClose }: { lavorazioneId: string; onClose: () => void }) {
  const [tab, setTab] = useState<TabId>("panoramica");
  const hubQuery = useLavorazioneHub(lavorazioneId);
  const hub = hubQuery.data;

  useEffect(() => {
    setTab("panoramica");
  }, [lavorazioneId]);

  const preventiviUi = useMemo(() => {
    if (!hub) return [];
    return hub.preventivi.map((row) => preventivoRowToRecordStub(row, null));
  }, [hub]);

  const documentiUi = useMemo(() => {
    if (!hub) return [];
    return hub.documenti.map(documentoRowToGestionale);
  }, [hub]);

  const listPageSize = useResponsiveListPageSize();

  const {
    page: scPage,
    setPage: setScPage,
    pageCount: scPageCount,
    sliceItems: sliceSc,
    showPager: showScPager,
    label: scPagerLabel,
    resetPage: resetScPage,
  } = useClientPagination(hub?.schede.length ?? 0, listPageSize);
  useEffect(() => {
    resetScPage();
  }, [lavorazioneId, hub?.schede.length, listPageSize, resetScPage]);
  const pagedSchede = useMemo(() => sliceSc(hub?.schede ?? []), [hub?.schede, sliceSc, scPage]);

  const {
    page: movPage,
    setPage: setMovPage,
    pageCount: movPageCount,
    sliceItems: sliceMov,
    showPager: showMovPager,
    label: movPagerLabel,
    resetPage: resetMovPage,
  } = useClientPagination(hub?.movimenti.length ?? 0, listPageSize);
  useEffect(() => {
    resetMovPage();
  }, [lavorazioneId, hub?.movimenti.length, listPageSize, resetMovPage]);
  const pagedMov = useMemo(() => sliceMov(hub?.movimenti ?? []), [hub?.movimenti, sliceMov, movPage]);

  const {
    page: pvPage,
    setPage: setPvPage,
    pageCount: pvPageCount,
    sliceItems: slicePv,
    showPager: showPvPager,
    label: pvPagerLabel,
    resetPage: resetPvPage,
  } = useClientPagination(preventiviUi.length, listPageSize);
  useEffect(() => {
    resetPvPage();
  }, [lavorazioneId, preventiviUi.length, listPageSize, resetPvPage]);
  const pagedPv = useMemo(() => slicePv(preventiviUi), [preventiviUi, slicePv, pvPage]);

  const {
    page: docPage,
    setPage: setDocPage,
    pageCount: docPageCount,
    sliceItems: sliceDoc,
    showPager: showDocPager,
    label: docPagerLabel,
    resetPage: resetDocPage,
  } = useClientPagination(documentiUi.length, listPageSize);
  useEffect(() => {
    resetDocPage();
  }, [lavorazioneId, documentiUi.length, listPageSize, resetDocPage]);
  const pagedDoc = useMemo(() => sliceDoc(documentiUi), [documentiUi, sliceDoc, docPage]);

  const {
    page: logPage,
    setPage: setLogPage,
    pageCount: logPageCount,
    sliceItems: sliceLog,
    showPager: showLogPager,
    label: logPagerLabel,
    resetPage: resetLogPage,
  } = useClientPagination(hub?.log.length ?? 0, listPageSize);
  useEffect(() => {
    resetLogPage();
  }, [lavorazioneId, hub?.log.length, listPageSize, resetLogPage]);
  const pagedLog = useMemo(() => sliceLog(hub?.log ?? []), [hub?.log, sliceLog, logPage]);

  const {
    page: tlPage,
    setPage: setTlPage,
    pageCount: tlPageCount,
    sliceItems: sliceTl,
    showPager: showTlPager,
    label: tlPagerLabel,
    resetPage: resetTlPage,
  } = useClientPagination(hub?.timeline.length ?? 0, listPageSize);
  useEffect(() => {
    resetTlPage();
  }, [lavorazioneId, hub?.timeline.length, listPageSize, resetTlPage]);
  const pagedTl = useMemo(() => sliceTl(hub?.timeline ?? []), [hub?.timeline, sliceTl, tlPage]);

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

  const titolo = hub ? `Lavorazione · ${hub.kpi.statoLabel}` : "Lavorazione";

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
        aria-labelledby="lav-hub-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id="lav-hub-title" className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {titolo}
            </h2>
            {hub ? (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Ingresso {fmtDay(hub.lavorazione.data_ingresso)} · Uscita {fmtDay(hub.lavorazione.data_uscita)}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button type="button" className={erpBtnNeutral} onClick={onClose}>
              Chiudi
            </button>
          </div>
        </div>

        {hubQuery.isError ? (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {hubQuery.error?.message ?? "Errore caricamento hub lavorazione."}
          </div>
        ) : null}

        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-zinc-100 bg-zinc-50/50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/80">
          {tabBtn("panoramica", "Panoramica")}
          {tabBtn("schede", `Schede (${hub?.kpi.countSchede ?? 0})`)}
          {tabBtn("movimenti", `Movimenti (${hub?.kpi.countMovimenti ?? 0})`)}
          {tabBtn("preventivi", `Preventivi (${hub?.kpi.countPreventivi ?? 0})`)}
          {tabBtn("documenti", `Documenti (${hub?.kpi.countDocumenti ?? 0})`)}
          {tabBtn("timeline", `Timeline (${hub?.timeline.length ?? 0})`)}
          {tabBtn("log", `Log (${hub?.kpi.countLog ?? 0})`)}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {hubQuery.isLoading && !hub ? <p className="text-sm text-zinc-500">Caricamento…</p> : null}

          {tab === "panoramica" && hub ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-950/40 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-500">Stato</p>
                  <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-50">{hub.kpi.statoLabel}</p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-500">Priorità</p>
                  <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-50">{hub.kpi.priorita}</p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-500">Giorni apertura</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {hub.kpi.giorniApertura ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-500">Movimenti magazzino</p>
                  <p className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                    {hub.kpi.movimentiEntrataCount} in · {hub.kpi.movimentiUscitaCount} out
                  </p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-500">Qty uscite</p>
                  <p className="mt-0.5 tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">{hub.kpi.qtyRicambiUscita}</p>
                </div>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <p className="text-[10px] font-bold uppercase text-zinc-500">Note</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{(hub.lavorazione.note ?? "").trim() || "—"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildPreventiviArchivioFilterHref(
                    hub.lavorazioneId,
                    isStatoLavorazioneChiusoDb(hub.lavorazione.stato) ? "storico" : "attiva",
                  )}
                  className={`${erpBtnSoftOrange} inline-flex no-underline`}
                  onClick={onClose}
                >
                  Preventivi collegati
                </Link>
              </div>
            </div>
          ) : null}

          {tab === "schede" ? (
            <div className={`${dsTableWrap} ${dsScrollbar}`}>
              <table className={`${dsTable} min-w-[520px] text-xs`}>
                <thead>
                  <tr>
                    <th className={dsTableHeadCell}>Tipo</th>
                    <th className={dsTableHeadCell}>Creata</th>
                    <th className={dsTableHeadCell}>Aggiornata</th>
                  </tr>
                </thead>
                <tbody>
                  {(hub?.schede.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-2 py-6 text-center text-zinc-500">
                        Nessuna scheda collegata.
                      </td>
                    </tr>
                  ) : (
                    pagedSchede.map((s) => (
                      <tr key={s.id} className={dsTableRow}>
                        <td className="px-2 py-2 font-medium capitalize">{s.tipo}</td>
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px]">{fmtDt(s.created_at)}</td>
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px]">{fmtDt(s.updated_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {showScPager ? <TablePagination page={scPage} pageCount={scPageCount} onPageChange={setScPage} label={scPagerLabel} /> : null}
            </div>
          ) : null}

          {tab === "movimenti" ? (
            <div className={`${dsTableWrap} ${dsScrollbar}`}>
              <table className={`${dsTable} min-w-[520px] text-xs`}>
                <thead>
                  <tr>
                    <th className={dsTableHeadCell}>Tipo</th>
                    <th className={dsTableHeadCell}>Quantità</th>
                    <th className={dsTableHeadCell}>Ricambio</th>
                    <th className={dsTableHeadCell}>Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {(hub?.movimenti.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-6 text-center text-zinc-500">
                        Nessun movimento collegato.
                      </td>
                    </tr>
                  ) : (
                    pagedMov.map((m) => (
                      <tr key={m.id} className={dsTableRow}>
                        <td className="px-2 py-2 capitalize">{m.tipo}</td>
                        <td className="px-2 py-2 tabular-nums">{m.quantita}</td>
                        <td className="px-2 py-2 font-mono text-[11px]">{m.ricambio_id}</td>
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px]">{fmtDt(m.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {showMovPager ? <TablePagination page={movPage} pageCount={movPageCount} onPageChange={setMovPage} label={movPagerLabel} /> : null}
            </div>
          ) : null}

          {tab === "preventivi" ? (
            <>
              <ul className="space-y-2">
                {preventiviUi.length === 0 ? (
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
                {documentiUi.length === 0 ? (
                  <li className="text-sm text-zinc-500">Nessun documento sul mezzo collegato.</li>
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

          {tab === "timeline" ? (
            <>
              {pagedTl.length === 0 ? (
                <p className="text-sm text-zinc-500">Nessun evento in timeline.</p>
              ) : (
                <ul className="space-y-2">
                  {pagedTl.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex flex-col gap-1 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40"
                    >
                      <p className="text-[11px] font-mono text-zinc-500">{fmtDt(ev.at)}</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{ev.title}</p>
                      {ev.subtitle ? <p className="text-xs text-zinc-600 dark:text-zinc-400">{ev.subtitle}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
              {showTlPager ? <TablePagination page={tlPage} pageCount={tlPageCount} onPageChange={setTlPage} label={tlPagerLabel} /> : null}
            </>
          ) : null}

          {tab === "log" ? (
            hubQuery.isLoading && !hub ? (
              <p className="text-sm text-zinc-500">Caricamento log…</p>
            ) : (hub?.log.length ?? 0) === 0 ? (
              <GestionaleLogEmpty message="Nessuna voce nel registro modifiche per questa lavorazione." />
            ) : (
              <>
                <GestionaleLogList>
                  {pagedLog.map((lg) => (
                    <li key={lg.id} className="list-none rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40">
                      <p className="text-[11px] font-mono text-zinc-500">{fmtDt(lg.created_at)}</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{lg.azione}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        Autore: {lg.autore_id?.slice(0, 8) ?? "—"}…
                      </p>
                    </li>
                  ))}
                </GestionaleLogList>
                {showLogPager ? <TablePagination page={logPage} pageCount={logPageCount} onPageChange={setLogPage} label={logPagerLabel} /> : null}
              </>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
