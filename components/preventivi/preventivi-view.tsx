"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { PreventiviEditorModal } from "@/components/preventivi/preventivi-editor-modal";
import { useAuth } from "@/context/auth-context";
import { findMezzoForLavorazione } from "@/lib/schede/schede-autofill";
import { getMagazzinoReportSnapshot, subscribeMagazzinoReportSync } from "@/lib/magazzino/magazzino-report-sync";
import { getMezziReportSnapshot, subscribeMezziReportSync } from "@/lib/mezzi/mezzi-report-sync";
import { preventivoMatchesMezzo } from "@/lib/mezzi/mezzi-hub-merge";
import { buildNewPreventivoFromLavorazioneContext } from "@/lib/preventivi/generate-preventivo-from-lavorazione";
import { buildPreventiviLavorazioneFocusHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { openPreventivoPdfInNewTab } from "@/lib/preventivi/preventivi-pdf";
import { Q_PREVENTIVI_LAV, Q_PREVENTIVI_LAV_ORIG, Q_PREVENTIVI_MEZZO, Q_PREVENTIVI_NUOVO, Q_PREVENTIVI_OPEN } from "@/lib/preventivi/preventivi-query";
import { readAndClearPendingPreventivoPayload } from "@/lib/preventivi/preventivi-session-bridge";
import {
  appendPreventiviChangeLog,
  loadPreventiviChangeLog,
  removePreventiviChangeLogEntryById,
  type PreventiviLogStored,
} from "@/lib/preventivi/preventivi-change-log-storage";
import {
  deletePreventivo,
  loadPreventivi,
} from "@/lib/preventivi/preventivi-storage";
import { buildEmptyManualPreventivo } from "@/lib/preventivi/build-empty-manual-preventivo";
import { CAB_PREVENTIVI_LOG_REFRESH, CAB_PREVENTIVI_REFRESH } from "@/lib/sistema/cab-events";
import type { PreventivoLavorazioneOrigine, PreventivoRecord, PreventivoSortKey, PreventivoSortPhase } from "@/lib/preventivi/types";
import { dsBtnDanger, dsBtnNeutral, dsInput, dsPageToolbarBtn, dsStackPage, dsScrollbar, dsTable, dsTableHead, dsTableRow, dsTableWrap, dsTableThSticky, dsFocus } from "@/lib/ui/design-system";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { erpBtnNuovaLavorazione, erpFocus, gestionaleSelectFilterClass } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogPanelAsideClass,
  gestionaleLogPanelHeaderClass,
  gestionaleLogScrollEmbeddedClass,
  IconGestionaleLog,
  logEntryDismissBtnClass,
} from "@/components/gestionale/gestionale-log-ui";

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** yyyy-mm-dd → data locale valida, altrimenti null */
function parseYmdLocal(ymd: string): Date | null {
  const t = ymd.trim();
  if (!t) return null;
  const [ys, ms, ds] = t.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const day = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return null;
  const d = new Date(y, m - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) return null;
  return d;
}

function parseMoneyStr(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function fmtDataCreazioneTabella(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function comparePreventivo(a: PreventivoRecord, b: PreventivoRecord, key: PreventivoSortKey, phase: Exclude<PreventivoSortPhase, "natural">): number {
  const dir = phase === "asc" ? 1 : -1;
  switch (key) {
    case "numero":
      return a.numero.localeCompare(b.numero, "it", { numeric: true }) * dir;
    case "dataCreazione":
      return (new Date(a.dataCreazione).getTime() - new Date(b.dataCreazione).getTime()) * dir;
    case "cliente":
      return a.cliente.localeCompare(b.cliente, "it") * dir;
    case "macchinaRiassunto":
      return a.macchinaRiassunto.localeCompare(b.macchinaRiassunto, "it") * dir;
    case "targa":
      return a.targa.localeCompare(b.targa, "it") * dir;
    case "matricola":
      return a.matricola.localeCompare(b.matricola, "it") * dir;
    case "nScuderia":
      return a.nScuderia.localeCompare(b.nScuderia, "it") * dir;
    case "totaleFinale":
      return (a.totaleFinale - b.totaleFinale) * dir;
    case "lavorazioneId":
      return a.lavorazioneId.localeCompare(b.lavorazioneId, "it") * dir;
    default:
      return 0;
  }
}

function SortThPreventivo({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
  thClassName,
}: {
  label: string;
  columnKey: PreventivoSortKey;
  sortColumn: PreventivoSortKey | null;
  sortPhase: PreventivoSortPhase;
  onSort: (k: PreventivoSortKey) => void;
  thClassName?: string;
}) {
  const active = sortColumn === columnKey && (sortPhase === "asc" || sortPhase === "desc");
  let icon: ReactNode = <span className="opacity-40">↕</span>;
  if (active) {
    icon = sortPhase === "asc" ? <span>↑</span> : <span>↓</span>;
  }
  return (
    <th className={`${dsTableThSticky} px-3 py-2 align-middle text-left ${thClassName ?? ""}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex max-w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors duration-200 ease-out ${dsFocus} ${
          active ? "text-[color:var(--cab-primary)]" : "text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-text)]"
        }`}
      >
        <span className="truncate">{label}</span>
        {icon}
      </button>
    </th>
  );
}

export function PreventiviView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authorName: autore } = useAuth();
  const [rows, setRows] = useState<PreventivoRecord[]>(() => loadPreventivi());
  const [mezziSnap, setMezziSnap] = useState(() => getMezziReportSnapshot());
  const [magSnap, setMagSnap] = useState(() => getMagazzinoReportSnapshot());
  const [sortColumn, setSortColumn] = useState<PreventivoSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<PreventivoSortPhase>("natural");
  const [editor, setEditor] = useState<{ open: boolean; record: PreventivoRecord | null; isNew: boolean }>({
    open: false,
    record: null,
    isNew: false,
  });
  const [searchPreventivi, setSearchPreventivi] = useState("");
  const [filtriEspansi, setFiltriEspansi] = useState(false);

  const [filtroClientePrev, setFiltroClientePrev] = useState("__tutti__");
  const [filtroMarcaPrev, setFiltroMarcaPrev] = useState("__tutti__");
  const [filtroModelloPrev, setFiltroModelloPrev] = useState("__tutti__");
  const [filtroTargaPrev, setFiltroTargaPrev] = useState("");
  const [filtroMatricolaPrev, setFiltroMatricolaPrev] = useState("");
  const [filtroScuderiaPrev, setFiltroScuderiaPrev] = useState("");
  const [filtroMesePrev, setFiltroMesePrev] = useState("__tutti__");
  const [filtroAnnoPrev, setFiltroAnnoPrev] = useState("__tutti__");
  const [filtroDataDaPrev, setFiltroDataDaPrev] = useState("");
  const [filtroDataAPrev, setFiltroDataAPrev] = useState("");
  const [importoMinStr, setImportoMinStr] = useState("");
  const [importoMaxStr, setImportoMaxStr] = useState("");
  const pendingHandledRef = useRef(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<PreventiviLogStored[]>(() => loadPreventiviChangeLog());

  useEffect(() => {
    if (searchParams.get(Q_PREVENTIVI_NUOVO) !== "1") {
      pendingHandledRef.current = false;
    }
  }, [searchParams]);

  const reload = useCallback(() => {
    setRows(loadPreventivi());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    function onLogRefresh() {
      setLogEntries(loadPreventiviChangeLog());
    }
    window.addEventListener(CAB_PREVENTIVI_LOG_REFRESH, onLogRefresh);
    return () => window.removeEventListener(CAB_PREVENTIVI_LOG_REFRESH, onLogRefresh);
  }, []);

  useEffect(() => {
    if (logOpen) setLogEntries(loadPreventiviChangeLog());
  }, [logOpen]);

  useEffect(() => {
    if (!logOpen) return;
    const gap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      document.body.style.paddingRight = prevPad;
    };
  }, [logOpen]);

  useEffect(() => {
    function onRefresh() {
      reload();
    }
    window.addEventListener(CAB_PREVENTIVI_REFRESH, onRefresh);
    return () => window.removeEventListener(CAB_PREVENTIVI_REFRESH, onRefresh);
  }, [reload]);

  useEffect(() => {
    return subscribeMezziReportSync(() => setMezziSnap(getMezziReportSnapshot()));
  }, []);

  useEffect(() => {
    return subscribeMagazzinoReportSync(() => setMagSnap(getMagazzinoReportSnapshot()));
  }, []);

  const filterLavId = searchParams.get(Q_PREVENTIVI_LAV)?.trim() || "";
  const filterOrigRaw = searchParams.get(Q_PREVENTIVI_LAV_ORIG)?.trim() || "";
  const filterMezzoRaw = searchParams.get(Q_PREVENTIVI_MEZZO)?.trim() || "";
  const filterOrig: PreventivoLavorazioneOrigine | null =
    filterOrigRaw === "attiva" || filterOrigRaw === "storico" ? filterOrigRaw : null;

  const clientiPreventiviOpts = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const c = r.cliente.trim();
      if (c) s.add(c);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "it"));
  }, [rows]);

  const marchePvOpts = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const c = r.marcaAttrezzatura.trim();
      if (c) s.add(c);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "it"));
  }, [rows]);

  const modelliPvOpts = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const c = r.modelloAttrezzatura.trim();
      if (c) s.add(c);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "it"));
  }, [rows]);

  const anniPreventiviOpts = useMemo(() => {
    const s = new Set<number>();
    for (const r of rows) {
      const y = new Date(r.dataCreazione).getFullYear();
      if (!Number.isNaN(y)) s.add(y);
    }
    return [...s].sort((a, b) => b - a);
  }, [rows]);

  const modelliPvOptsByMarca = useMemo(() => {
    if (filtroMarcaPrev === "__tutti__") return modelliPvOpts;
    const mar = filtroMarcaPrev;
    const s = new Set<string>();
    for (const r of rows) {
      if (r.marcaAttrezzatura.trim() === mar) {
        const c = r.modelloAttrezzatura.trim();
        if (c) s.add(c);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b, "it"));
  }, [rows, filtroMarcaPrev, modelliPvOpts]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filterLavId && filterOrig) {
      list = list.filter((r) => r.lavorazioneId === filterLavId && r.lavorazioneOrigine === filterOrig);
    }
    if (filterMezzoRaw) {
      if (filterMezzoRaw.startsWith("hub-pv-")) {
        const pid = filterMezzoRaw.slice("hub-pv-".length);
        list = list.filter((r) => r.id === pid);
      } else {
        const mezzo = mezziSnap.find((m) => m.id === filterMezzoRaw);
        if (mezzo) list = list.filter((r) => preventivoMatchesMezzo(mezzo, r));
        else list = [];
      }
    }
    const rawDa = filtroDataDaPrev.trim();
    const rawA = filtroDataAPrev.trim();
    if (rawDa) {
      const p = parseYmdLocal(rawDa);
      if (p) {
        const startMs = startOfLocalDay(p).getTime();
        list = list.filter((r) => new Date(r.dataCreazione).getTime() >= startMs);
      }
    }
    if (rawA) {
      const p = parseYmdLocal(rawA);
      if (p) {
        const endMs = endOfLocalDay(p).getTime();
        list = list.filter((r) => new Date(r.dataCreazione).getTime() <= endMs);
      }
    }
    if (filtroClientePrev !== "__tutti__") {
      list = list.filter((r) => r.cliente === filtroClientePrev);
    }
    if (filtroMarcaPrev !== "__tutti__") {
      list = list.filter((r) => r.marcaAttrezzatura.trim() === filtroMarcaPrev);
    }
    if (filtroModelloPrev !== "__tutti__") {
      list = list.filter((r) => r.modelloAttrezzatura.trim() === filtroModelloPrev);
    }
    const targaQ = filtroTargaPrev.trim().toLowerCase();
    if (targaQ) list = list.filter((r) => r.targa.toLowerCase().includes(targaQ));
    const matQ = filtroMatricolaPrev.trim().toLowerCase();
    if (matQ) list = list.filter((r) => r.matricola.toLowerCase().includes(matQ));
    const scQ = filtroScuderiaPrev.trim().toLowerCase();
    if (scQ) list = list.filter((r) => r.nScuderia.toLowerCase().includes(scQ));
    if (filtroMesePrev !== "__tutti__") {
      const mi = Number(filtroMesePrev);
      list = list.filter((r) => {
        const d = new Date(r.dataCreazione);
        return !Number.isNaN(d.getTime()) && d.getMonth() + 1 === mi;
      });
    }
    if (filtroAnnoPrev !== "__tutti__") {
      const y = Number(filtroAnnoPrev);
      list = list.filter((r) => new Date(r.dataCreazione).getFullYear() === y);
    }
    const imin = parseMoneyStr(importoMinStr);
    const imax = parseMoneyStr(importoMaxStr);
    if (imin !== null) list = list.filter((r) => r.totaleFinale >= imin);
    if (imax !== null) list = list.filter((r) => r.totaleFinale <= imax);
    const q = searchPreventivi.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const hay = [
          r.numero,
          r.cliente,
          r.macchinaRiassunto,
          r.targa,
          r.matricola,
          r.nScuderia,
          r.marcaAttrezzatura,
          r.modelloAttrezzatura,
          r.lavorazioneId,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [
    rows,
    filterLavId,
    filterOrig,
    filterMezzoRaw,
    filtroClientePrev,
    filtroMarcaPrev,
    filtroModelloPrev,
    filtroTargaPrev,
    filtroMatricolaPrev,
    filtroScuderiaPrev,
    filtroMesePrev,
    filtroAnnoPrev,
    filtroDataDaPrev,
    filtroDataAPrev,
    importoMinStr,
    importoMaxStr,
    searchPreventivi,
    mezziSnap,
  ]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    if (sortColumn === null || sortPhase === "natural") {
      return list;
    }
    list.sort((a, b) => {
      const c = comparePreventivo(a, b, sortColumn, sortPhase);
      if (c !== 0) return c;
      return new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime();
    });
    return list;
  }, [filteredRows, sortColumn, sortPhase]);

  const listPageSize = useResponsiveListPageSize();
  const preventiviPagerDeps = useMemo(
    () =>
      `${filterLavId ?? ""}|${filterOrig ?? ""}|${filterMezzoRaw}|${filtroClientePrev}|${filtroMarcaPrev}|${filtroModelloPrev}|${filtroTargaPrev}|${filtroMatricolaPrev}|${filtroScuderiaPrev}|${filtroMesePrev}|${filtroAnnoPrev}|${filtroDataDaPrev}|${filtroDataAPrev}|${importoMinStr}|${importoMaxStr}|${searchPreventivi}|${sortColumn ?? ""}|${sortPhase}`,
    [
      filterLavId,
      filterOrig,
      filterMezzoRaw,
      filtroClientePrev,
      filtroMarcaPrev,
      filtroModelloPrev,
      filtroTargaPrev,
      filtroMatricolaPrev,
      filtroScuderiaPrev,
      filtroMesePrev,
      filtroAnnoPrev,
      filtroDataDaPrev,
      filtroDataAPrev,
      importoMinStr,
      importoMaxStr,
      searchPreventivi,
      sortColumn,
      sortPhase,
    ],
  );
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(sortedRows.length, listPageSize);
  useEffect(() => {
    resetPage();
  }, [preventiviPagerDeps, listPageSize, resetPage]);
  const pagedRows = useMemo(() => sliceItems(sortedRows), [sliceItems, sortedRows, page]);

  const {
    page: logPage,
    setPage: setLogPage,
    pageCount: logPageCount,
    sliceItems: sliceLogEntries,
    showPager: showLogPager,
    label: logPagerLabel,
    resetPage: resetLogPage,
  } = useClientPagination(logEntries.length, listPageSize);
  useEffect(() => {
    resetLogPage();
  }, [logOpen, logEntries.length, listPageSize, resetLogPage]);
  const pagedLogEntries = useMemo(() => sliceLogEntries(logEntries), [logEntries, sliceLogEntries, logPage]);

  function onSortMain(k: PreventivoSortKey) {
    if (sortColumn !== k) {
      setSortColumn(k);
      setSortPhase("asc");
      return;
    }
    if (sortPhase === "asc") {
      setSortPhase("desc");
    } else if (sortPhase === "desc") {
      setSortColumn(null);
      setSortPhase("natural");
    } else {
      setSortColumn(k);
      setSortPhase("asc");
    }
  }

  function clearLavFilter() {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete(Q_PREVENTIVI_LAV);
    sp.delete(Q_PREVENTIVI_LAV_ORIG);
    const q = sp.toString();
    router.replace(q ? `/preventivi?${q}` : "/preventivi", { scroll: false });
  }

  function clearMezzoFilter() {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete(Q_PREVENTIVI_MEZZO);
    const q = sp.toString();
    router.replace(q ? `/preventivi?${q}` : "/preventivi", { scroll: false });
  }

  const hasAdvancedPanelFilters =
    filtroClientePrev !== "__tutti__" ||
    filtroMarcaPrev !== "__tutti__" ||
    filtroModelloPrev !== "__tutti__" ||
    Boolean(filtroTargaPrev.trim()) ||
    Boolean(filtroMatricolaPrev.trim()) ||
    Boolean(filtroScuderiaPrev.trim()) ||
    filtroMesePrev !== "__tutti__" ||
    filtroAnnoPrev !== "__tutti__" ||
    Boolean(importoMinStr.trim()) ||
    Boolean(importoMaxStr.trim()) ||
    Boolean(filtroDataDaPrev.trim()) ||
    Boolean(filtroDataAPrev.trim());

  function resetPreventiviFiltriAvanzati() {
    setFiltroClientePrev("__tutti__");
    setFiltroMarcaPrev("__tutti__");
    setFiltroModelloPrev("__tutti__");
    setFiltroTargaPrev("");
    setFiltroMatricolaPrev("");
    setFiltroScuderiaPrev("");
    setFiltroMesePrev("__tutti__");
    setFiltroAnnoPrev("__tutti__");
    setImportoMinStr("");
    setImportoMaxStr("");
    setFiltroDataDaPrev("");
    setFiltroDataAPrev("");
  }

  function resetPreventiviPanelFilters() {
    setFiltroClientePrev("__tutti__");
    setFiltroMarcaPrev("__tutti__");
    setFiltroModelloPrev("__tutti__");
    setFiltroTargaPrev("");
    setFiltroMatricolaPrev("");
    setFiltroScuderiaPrev("");
    setFiltroMesePrev("__tutti__");
    setFiltroAnnoPrev("__tutti__");
    setImportoMinStr("");
    setImportoMaxStr("");
    setFiltroDataDaPrev("");
    setFiltroDataAPrev("");
    setSearchPreventivi("");
    setFiltriEspansi(false);
  }

  useEffect(() => {
    if (pendingHandledRef.current) return;
    const nuovo = searchParams.get(Q_PREVENTIVI_NUOVO);
    const pending = readAndClearPendingPreventivoPayload();
    if (!pending) return;
    if (nuovo !== "1") return;
    pendingHandledRef.current = true;
    const mezzo = findMezzoForLavorazione(mezziSnap, pending.lav);
    const rec = buildNewPreventivoFromLavorazioneContext({
      lav: pending.lav,
      origine: pending.origine,
      bundle: pending.bundle,
      mezzo,
      magazzino: magSnap,
      autore: autore.trim() || "Operatore",
    });
    setEditor({ open: true, record: rec, isNew: true });
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete(Q_PREVENTIVI_NUOVO);
    const q = sp.toString();
    router.replace(q ? `/preventivi?${q}` : "/preventivi", { scroll: false });
  }, [searchParams, router, mezziSnap, magSnap, autore]);

  useEffect(() => {
    const openId = searchParams.get(Q_PREVENTIVI_OPEN)?.trim();
    if (!openId) return;
    const rec = rows.find((r) => r.id === openId);
    const t = window.setTimeout(() => {
      if (rec) setEditor({ open: true, record: rec, isNew: false });
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete(Q_PREVENTIVI_OPEN);
      const q = sp.toString();
      router.replace(q ? `/preventivi?${q}` : "/preventivi", { scroll: false });
    }, 100);
    return () => window.clearTimeout(t);
  }, [searchParams, rows, router]);

  function apriModifica(p: PreventivoRecord) {
    setEditor({ open: true, record: p, isNew: false });
  }

  function onElimina(p: PreventivoRecord) {
    if (!window.confirm(`Eliminare il preventivo ${p.numero}?`)) return;
    const u = autore.trim() || "Operatore";
    appendPreventiviChangeLog({
      tone: "delete",
      tipoRiga: "ELIMINAZIONE PREVENTIVO",
      oggettoRiga: `Preventivo ${p.numero}`,
      modificaRiga: `Cliente: ${p.cliente || "—"}. Totale ${p.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €.`,
      autore: u,
      atIso: new Date().toISOString(),
    });
    deletePreventivo(p.id);
    reload();
  }

  const bannerFilter =
    filterLavId && filterOrig ? (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50/80 px-3 py-2 text-sm text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/35 dark:text-orange-100">
        <span>
          Filtro attivo: preventivi collegati alla lavorazione selezionata ({filterOrig === "attiva" ? "attiva" : "storico"}).
        </span>
        <button type="button" className={dsBtnNeutral} onClick={clearLavFilter}>
          Rimuovi filtro
        </button>
      </div>
    ) : null;

  const bannerMezzo = filterMezzoRaw ? (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50/80 px-3 py-2 text-sm text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/35 dark:text-orange-100">
      <span>Filtro attivo: preventivi collegati al mezzo selezionato.</span>
      <button type="button" className={dsBtnNeutral} onClick={clearMezzoFilter}>
        Rimuovi filtro
      </button>
    </div>
  ) : null;

  return (
    <>
      <PageHeader
        title="Preventivi"
        actions={
          <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
              title="Storico modifiche preventivi (ultime 200)"
            >
              <IconGestionaleLog />
              <span className="sr-only">Log modifiche</span>
            </button>
          </div>
        }
      />

      <div className={dsStackPage}>

      {bannerFilter}
      {bannerMezzo}

      <ShellCard className="overflow-hidden rounded-xl border-zinc-200/95 shadow-md dark:border-zinc-800">
        <div className="mb-3 flex flex-col gap-3 sm:mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={() =>
                setEditor({
                  open: true,
                  record: buildEmptyManualPreventivo(autore.trim() || "Operatore"),
                  isNew: true,
                })
              }
              className={`${erpBtnNuovaLavorazione} h-11 shrink-0 px-4 sm:min-w-[11rem]`}
              title="Crea un preventivo senza collegamento a lavorazione"
            >
              <span className="text-base font-semibold leading-none" aria-hidden>
                +
              </span>
              Nuovo preventivo
            </button>
            <div className="relative min-h-11 min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" aria-hidden>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Numero, cliente, macchina, targa, matricola, scuderia…"
                value={searchPreventivi}
                onChange={(e) => setSearchPreventivi(e.target.value)}
                className={`${dsInput} h-11 min-h-11 py-0 pl-10 pr-3 ${erpFocus}`}
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltriEspansi((open) => !open)}
              className={`${dsPageToolbarBtn} relative h-11 min-w-[8.75rem] shrink-0 gap-2 px-3 text-sm`}
              aria-expanded={filtriEspansi}
            >
              Filtri
              <svg
                className={`h-4 w-4 shrink-0 text-orange-600 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:text-orange-400 ${filtriEspansi ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {hasAdvancedPanelFilters ? (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-zinc-950"
                  title="Filtri avanzati attivi"
                  aria-hidden
                ></span>
              ) : null}
            </button>
          </div>

          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              filtriEspansi ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800" aria-label="Filtri preventivi">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Campi filtro</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Cliente
                    <select
                      className={gestionaleSelectFilterClass}
                      value={filtroClientePrev}
                      onChange={(e) => setFiltroClientePrev(e.target.value)}
                      aria-label="Filtra cliente"
                    >
                      <option value="__tutti__">Tutti</option>
                      {clientiPreventiviOpts.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Marca
                    <select
                      className={gestionaleSelectFilterClass}
                      value={filtroMarcaPrev}
                      onChange={(e) => {
                        setFiltroMarcaPrev(e.target.value);
                        setFiltroModelloPrev("__tutti__");
                      }}
                      aria-label="Filtra marca attrezzatura"
                    >
                      <option value="__tutti__">Tutte</option>
                      {marchePvOpts.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Modello
                    <select
                      className={gestionaleSelectFilterClass}
                      value={filtroModelloPrev}
                      onChange={(e) => setFiltroModelloPrev(e.target.value)}
                      aria-label="Filtra modello attrezzatura"
                    >
                      <option value="__tutti__">Tutti</option>
                      {modelliPvOptsByMarca.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Targa (contiene)
                    <input
                      value={filtroTargaPrev}
                      onChange={(e) => setFiltroTargaPrev(e.target.value)}
                      className={`${dsInput} py-2 text-xs ${erpFocus}`}
                      autoComplete="off"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Matricola (contiene)
                    <input
                      value={filtroMatricolaPrev}
                      onChange={(e) => setFiltroMatricolaPrev(e.target.value)}
                      className={`${dsInput} py-2 text-xs ${erpFocus}`}
                      autoComplete="off"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    N. scuderia (contiene)
                    <input
                      value={filtroScuderiaPrev}
                      onChange={(e) => setFiltroScuderiaPrev(e.target.value)}
                      className={`${dsInput} py-2 text-xs ${erpFocus}`}
                      autoComplete="off"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
                    <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Importo min (€)
                      <input
                        value={importoMinStr}
                        onChange={(e) => setImportoMinStr(e.target.value)}
                        inputMode="decimal"
                        placeholder="0"
                        className={`${dsInput} py-2 text-xs ${erpFocus}`}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Importo max (€)
                      <input
                        value={importoMaxStr}
                        onChange={(e) => setImportoMaxStr(e.target.value)}
                        inputMode="decimal"
                        placeholder="∞"
                        className={`${dsInput} py-2 text-xs ${erpFocus}`}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                    <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Data da
                      <input
                        type="date"
                        value={filtroDataDaPrev}
                        onChange={(e) => setFiltroDataDaPrev(e.target.value)}
                        className={gestionaleSelectFilterClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Data a
                      <input
                        type="date"
                        value={filtroDataAPrev}
                        onChange={(e) => setFiltroDataAPrev(e.target.value)}
                        className={gestionaleSelectFilterClass}
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Mese creazione
                    <select
                      className={gestionaleSelectFilterClass}
                      value={filtroMesePrev}
                      onChange={(e) => setFiltroMesePrev(e.target.value)}
                      aria-label="Mese data creazione"
                    >
                      <option value="__tutti__">Tutti</option>
                      <option value="1">Gennaio</option>
                      <option value="2">Febbraio</option>
                      <option value="3">Marzo</option>
                      <option value="4">Aprile</option>
                      <option value="5">Maggio</option>
                      <option value="6">Giugno</option>
                      <option value="7">Luglio</option>
                      <option value="8">Agosto</option>
                      <option value="9">Settembre</option>
                      <option value="10">Ottobre</option>
                      <option value="11">Novembre</option>
                      <option value="12">Dicembre</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Anno creazione
                    <select
                      className={gestionaleSelectFilterClass}
                      value={filtroAnnoPrev}
                      onChange={(e) => setFiltroAnnoPrev(e.target.value)}
                      aria-label="Anno data creazione"
                    >
                      <option value="__tutti__">Tutti</option>
                      {anniPreventiviOpts.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Intervallo date, mese e anno si combinano: un preventivo deve soddisfarli tutti se valorizzati.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={dsBtnNeutral} onClick={resetPreventiviFiltriAvanzati}>
                    Reimposta campi
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              <span className="tabular-nums font-semibold text-zinc-700 dark:text-zinc-200">{sortedRows.length}</span> risultati
              {filterLavId && filterOrig ? " · filtro lavorazione" : ""}
              {filterMezzoRaw ? " · filtro mezzo" : ""}
              {searchPreventivi.trim() || hasAdvancedPanelFilters ? " · filtri attivi" : ""}
            </span>
            {searchPreventivi.trim() || hasAdvancedPanelFilters ? (
              <button
                type="button"
                className="font-semibold text-orange-700 underline-offset-2 hover:underline dark:text-orange-300"
                onClick={resetPreventiviPanelFilters}
              >
                Azzera filtri
              </button>
            ) : null}
          </p>
        </div>

        <div className={`${dsTableWrap} ${dsScrollbar}`}>
          <table className={`${dsTable} min-w-[1180px] w-full table-fixed text-sm text-zinc-900 dark:text-zinc-100`}>
            <thead className={`border-b border-zinc-100 dark:border-zinc-800 ${dsTableHead}`}>
              <tr>
                <SortThPreventivo
                  label="N."
                  columnKey="numero"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[5.5rem]"
                />
                <SortThPreventivo
                  label="Data"
                  columnKey="dataCreazione"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[5.25rem]"
                />
                <SortThPreventivo
                  label="Cliente"
                  columnKey="cliente"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                />
                <SortThPreventivo
                  label="Mezzo"
                  columnKey="macchinaRiassunto"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                />
                <SortThPreventivo
                  label="Targa"
                  columnKey="targa"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[4.25rem]"
                />
                <SortThPreventivo
                  label="Matricola"
                  columnKey="matricola"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[5.5rem]"
                />
                <SortThPreventivo
                  label="Scud."
                  columnKey="nScuderia"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[4.5rem]"
                />
                <SortThPreventivo
                  label="Totale"
                  columnKey="totaleFinale"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[5.5rem]"
                />
                <SortThPreventivo
                  label="Lav."
                  columnKey="lavorazioneId"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[6.5rem]"
                />
                <th className="sticky top-0 z-10 w-[8.5rem] bg-zinc-50 px-3 py-2 text-right text-xs font-semibold uppercase text-zinc-500 shadow-[0_1px_0_0_rgb(228_228_231)] dark:bg-zinc-800/95 dark:text-zinc-400 dark:shadow-[0_1px_0_0_rgb(39_39_42)]">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((p) => {
                const hrefLav = p.lavorazioneId.trim()
                  ? buildPreventiviLavorazioneFocusHref(p.lavorazioneId, p.lavorazioneOrigine)
                  : null;
                return (
                  <tr
                    key={p.id}
                    className={`${dsTableRow} h-14 bg-white dark:bg-zinc-900/40`}
                  >
                    <td className="px-3 align-middle font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{p.numero}</td>
                    <td className="px-3 align-middle tabular-nums text-zinc-600 dark:text-zinc-300">{fmtDataCreazioneTabella(p.dataCreazione)}</td>
                    <td className="min-w-0 px-3 align-middle text-zinc-800 dark:text-zinc-100">
                      <span className="line-clamp-2 break-words">{p.cliente || "—"}</span>
                    </td>
                    <td className="min-w-0 px-3 align-middle text-zinc-700 dark:text-zinc-200">
                      <span className="line-clamp-2 break-words">{p.macchinaRiassunto || "—"}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 align-middle font-mono text-xs text-zinc-600 dark:text-zinc-300">{p.targa || "—"}</td>
                    <td className="min-w-0 px-3 align-middle font-mono text-xs text-zinc-600 dark:text-zinc-300">
                      <span className="line-clamp-1">{p.matricola || "—"}</span>
                    </td>
                    <td className="min-w-0 px-3 align-middle text-xs text-zinc-600 dark:text-zinc-300">
                      <span className="line-clamp-1" title={p.nScuderia || undefined}>
                        {p.nScuderia || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 align-middle text-right tabular-nums font-medium text-zinc-800 dark:text-zinc-100">
                      {p.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="min-w-0 px-3 align-middle">
                      {hrefLav ? (
                        <>
                          <Link
                            href={hrefLav}
                            className="text-[11px] font-semibold text-orange-700 underline-offset-2 hover:underline dark:text-orange-300"
                          >
                            Apri
                          </Link>
                          <div className="truncate text-[9px] leading-tight text-zinc-400" title={p.lavorazioneId}>
                            {p.lavorazioneOrigine === "storico" ? "St." : "Att."} · {p.lavorazioneId}
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Man.</span>
                      )}
                    </td>
                    <td className="px-3 align-middle text-right">
                      <div className="inline-flex shrink-0 flex-nowrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className={`${dsBtnNeutral} inline-flex h-8 w-8 shrink-0 items-center justify-center p-0`}
                          onClick={() => apriModifica(p)}
                          title="Apri / modifica"
                          aria-label="Apri o modifica preventivo"
                        >
                          <svg className="h-4 w-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={`${dsBtnNeutral} inline-flex h-8 w-8 shrink-0 items-center justify-center p-0`}
                          onClick={() => openPreventivoPdfInNewTab(p, autore.trim() || "Operatore")}
                          title="Esporta PDF"
                          aria-label="Esporta PDF preventivo"
                        >
                          <svg className="h-4 w-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={`${dsBtnDanger} inline-flex h-8 w-8 shrink-0 items-center justify-center p-0`}
                          onClick={() => onElimina(p)}
                          title="Elimina"
                          aria-label="Elimina preventivo"
                        >
                          <svg className="h-4 w-4 shrink-0 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
        {sortedRows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            Nessun preventivo in archivio. Usa «Nuovo preventivo» per un preventivo manuale, oppure «Genera preventivo» dalle schede di una
            lavorazione per una bozza precompilata.
          </p>
        ) : null}
      </ShellCard>

      <PreventiviEditorModal
        open={editor.open}
        record={editor.record}
        isNew={editor.isNew}
        autore={autore.trim() || "Operatore"}
        onClose={() => setEditor({ open: false, record: null, isNew: false })}
        onSaved={reload}
      />
      </div>

      {logOpen ? (
        <div
          className="fixed inset-0 z-[55] flex items-stretch justify-end bg-black/30"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setLogOpen(false);
            }
          }}
        >
          <aside
            className={gestionaleLogPanelAsideClass}
            aria-label="Log modifiche preventivi"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={gestionaleLogPanelHeaderClass}>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log modifiche preventivi</h2>
              <button type="button" onClick={() => setLogOpen(false)} className={dsBtnNeutral}>
                Chiudi
              </button>
            </div>
            <div className={`flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3`}>
              <div className={gestionaleLogScrollEmbeddedClass}>
              {logEntries.length === 0 ? (
                <GestionaleLogEmpty message="Nessuna modifica registrata." />
              ) : (
                <>
                  <GestionaleLogList>
                    {pagedLogEntries.map((entry) => (
                      <li key={entry.id} className="list-none">
                        <GestionaleLogEntryFourLines
                          vm={{
                            tone: entry.tone,
                            tipoRiga: entry.tipoRiga,
                            oggettoRiga: entry.oggettoRiga,
                            modificaRiga: entry.modificaRiga,
                            autore: entry.autore,
                            atIso: entry.atIso,
                          }}
                          trailing={
                            <button
                              type="button"
                              className={logEntryDismissBtnClass}
                              aria-label="Rimuovi voce dal log"
                              title="Rimuovi voce dal log"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Rimuovere questa voce dal log?")) removePreventiviChangeLogEntryById(entry.id);
                              }}
                            >
                              ×
                            </button>
                          }
                        />
                      </li>
                    ))}
                  </GestionaleLogList>
                </>
              )}
              </div>
              {showLogPager ? (
                <TablePagination page={logPage} pageCount={logPageCount} onPageChange={setLogPage} label={logPagerLabel} />
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
