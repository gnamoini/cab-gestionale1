"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { MezziFilters } from "@/components/gestionale/mezzi/mezzi-filters";
import { MezziHubDetailModal } from "@/components/gestionale/mezzi/mezzi-hub-detail-modal";
import { MezziTable } from "@/components/gestionale/mezzi/mezzi-table";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  erpBtnAccent,
  erpBtnNeutral,
  erpBtnNuovaLavorazione,
  erpBtnSoftOrange,
  erpFocus,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  compareMezzi,
  countDocumentiPerMezzo,
  interventiUltimi12Mesi,
  mediaGiorniFermoInterventi,
  mezziConInterventiRecenti,
  ultimoInterventoIso,
} from "@/lib/mezzi/mezzi-helpers";
import { interventiMezzoDaLavorazioniDb, mezzoHaLavorazioneAttivaDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { documentoRowToGestionale, logModificaRowToMezziHubLogEntry, toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { MEZZI_OGGI_DEMO, type MezzoGestito, type MezzoInterventoLavorazione, type MezziSortKey, type MezziSortPhase } from "@/lib/mezzi/types";
import { dsPageToolbarBtn, dsStackPage, dsScrollbar, dsTable, dsTableHead, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import {
  GestionaleLogChangeList,
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  IconGestionaleLog,
  buildMezziGestionaleLogViewModel,
  gestionaleLogPanelAsideClass,
  gestionaleLogPanelHeaderClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { Q_FOCUS_MEZZO } from "@/lib/navigation/dashboard-log-links";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import type { MezzoFilters, MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import {
  useDocumentiListQuery,
  useLogListQuery,
  useMezziListQuery,
} from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useMezzoCreateMutation, useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";

function formatItDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayIdent(s: string) {
  const t = s?.trim();
  return t && t !== "—" ? t : "—";
}

function naturalMezziOrder(a: MezzoGestito, b: MezzoGestito) {
  return a.id.localeCompare(b.id, "en");
}

function getEmptyNuovo() {
  return {
    cliente: "",
    utilizzatore: "",
    marca: "",
    modello: "",
    targa: "",
    matricola: "",
    numeroScuderia: "",
    anno: String(new Date().getFullYear()),
  };
}

function gestitoToForm(m: MezzoGestito) {
  return {
    cliente: m.cliente,
    utilizzatore: m.utilizzatore === "—" ? "" : m.utilizzatore,
    marca: m.marca,
    modello: m.modello === "—" ? "" : m.modello,
    targa: m.targa === "—" ? "" : m.targa,
    matricola: m.matricola === "—" ? "" : m.matricola,
    numeroScuderia: m.numeroScuderia ?? "",
    anno: String(m.anno),
  };
}

function formToMezzoInsert(f: ReturnType<typeof getEmptyNuovo>): MezzoInsert {
  const anno = Math.max(1980, Math.min(2035, parseInt(f.anno, 10) || new Date().getFullYear()));
  return {
    cliente: f.cliente.trim(),
    utilizzatore: f.utilizzatore.trim() || null,
    marca: f.marca.trim(),
    modello: f.modello.trim() || "—",
    targa: f.targa.trim() || null,
    matricola: f.matricola.trim() || "—",
    numero_scuderia: f.numeroScuderia.trim() || null,
    anno,
  };
}

function formToMezzoUpdate(f: ReturnType<typeof getEmptyNuovo>): MezzoUpdate {
  return formToMezzoInsert(f);
}

export function MezziView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroModello, setFiltroModello] = useState("");
  const [filtroTarga, setFiltroTarga] = useState("");
  const [filtroNumeroScuderia, setFiltroNumeroScuderia] = useState("");

  const serviceFilters = useMemo((): MezzoFilters => {
    return {
      search: search.trim() || undefined,
      cliente: filtroCliente.trim() || undefined,
      marca: filtroMarca.trim() || undefined,
      modello: filtroModello.trim() || undefined,
      targa: filtroTarga.trim() || undefined,
      numero_scuderia: filtroNumeroScuderia.trim() || undefined,
    };
  }, [search, filtroCliente, filtroMarca, filtroModello, filtroTarga, filtroNumeroScuderia]);

  const {
    data: mezzoRows = [],
    isLoading: mezziLoading,
    isError: mezziError,
    error: mezziErr,
    refetch: refetchMezzi,
  } = useMezziListQuery(serviceFilters);

  const { data: lavRows = [] } = useLavorazioniList({ includeMezzo: true });
  const { data: docRowsAll = [] } = useDocumentiListQuery(undefined, { staleTime: 60_000 });

  const mezziUi = useMemo(() => mezzoRows.map(toMezzoUI), [mezzoRows]);

  const interventiByMezzoId = useMemo(() => {
    const map = new Map<string, MezzoInterventoLavorazione[]>();
    for (const m of mezziUi) {
      map.set(m.id, interventiMezzoDaLavorazioniDb(m, lavRows));
    }
    return map;
  }, [mezziUi, lavRows]);

  const inOfficina = useCallback((m: MezzoGestito) => mezzoHaLavorazioneAttivaDb(m, lavRows), [lavRows]);

  const [sortColumn, setSortColumn] = useState<MezziSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<MezziSortPhase>("natural");

  const onSort = useCallback(
    (k: MezziSortKey) => {
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
    },
    [sortColumn, sortPhase],
  );

  const sorted = useMemo(() => {
    const rows = [...mezziUi];
    rows.sort((a, b) => compareMezzi(a, b, sortColumn, sortPhase, naturalMezziOrder));
    return rows;
  }, [mezziUi, sortColumn, sortPhase]);

  const listPageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(sorted.length, listPageSize);
  const mezziFilterKey = `${search}|${filtroCliente}|${filtroMarca}|${filtroModello}|${filtroTarga}|${filtroNumeroScuderia}|${sortColumn ?? ""}|${sortPhase}`;

  useEffect(() => {
    resetPage();
  }, [mezziFilterKey, listPageSize, resetPage]);

  const pagedSorted = useMemo(() => sliceItems(sorted), [sliceItems, sorted, page]);

  const docsUiAll = useMemo(() => docRowsAll.map(documentoRowToGestionale), [docRowsAll]);

  const kpiTotali = mezziUi.length;
  const kpiConDocumenti = useMemo(
    () => mezziUi.filter((m) => countDocumentiPerMezzo(m, docsUiAll) > 0).length,
    [mezziUi, docsUiAll],
  );
  const kpiInterventi = useMemo(
    () => mezziConInterventiRecenti(mezziUi, (m) => interventiByMezzoId.get(m.id) ?? [], MEZZI_OGGI_DEMO),
    [mezziUi, interventiByMezzoId],
  );

  const [hubMezzo, setHubMezzo] = useState<MezzoGestito | null>(null);
  const [storicoMezzo, setStoricoMezzo] = useState<MezzoGestito | null>(null);
  const [storicoSortDesc, setStoricoSortDesc] = useState(true);
  const [nuovoOpen, setNuovoOpen] = useState(false);
  const [nuovoForm, setNuovoForm] = useState(getEmptyNuovo);
  const [editMezzo, setEditMezzo] = useState<MezzoGestito | null>(null);
  const [editForm, setEditForm] = useState(() => getEmptyNuovo());

  const [logOpen, setLogOpen] = useState(false);
  const logQuery = useLogListQuery({ entita: "mezzi", limit: 250 }, { enabled: logOpen });
  const logEntriesUi = useMemo(() => (logQuery.data ?? []).map(logModificaRowToMezziHubLogEntry), [logQuery.data]);

  const {
    page: logPage,
    setPage: setLogPage,
    pageCount: logPageCount,
    sliceItems: sliceLogEntries,
    showPager: showLogPager,
    label: logPagerLabel,
    resetPage: resetLogPage,
  } = useClientPagination(logEntriesUi.length, listPageSize);

  useEffect(() => {
    resetLogPage();
  }, [logOpen, logEntriesUi.length, listPageSize, resetLogPage]);

  const pagedLogEntries = useMemo(() => sliceLogEntries(logEntriesUi), [logEntriesUi, sliceLogEntries, logPage]);

  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const flashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createMut = useMezzoCreateMutation();
  const updateMut = useMezzoUpdateMutation();

  const flashRow = useCallback((id: string) => {
    if (flashClearRef.current) clearTimeout(flashClearRef.current);
    setFlashRowId(id);
    flashClearRef.current = setTimeout(() => {
      setFlashRowId(null);
      flashClearRef.current = null;
    }, 820);
  }, []);

  const focusMezzoInTable = useCallback(
    (id: string) => {
      setHubMezzo(null);
      setStoricoMezzo(null);
      setEditMezzo(null);
      setNuovoOpen(false);
      setFiltroCliente("");
      setFiltroMarca("");
      setFiltroModello("");
      setFiltroTarga("");
      setFiltroNumeroScuderia("");
      setSearch("");
      setLogOpen(false);
      flashRow(id);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById(`mezzo-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      });
    },
    [flashRow],
  );

  useEffect(() => {
    return () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current);
    };
  }, []);

  const anyOverlay = Boolean(hubMezzo || storicoMezzo || nuovoOpen || editMezzo || logOpen);
  useEffect(() => {
    const id = searchParams.get(Q_FOCUS_MEZZO)?.trim();
    if (!id) return;
    const t = window.setTimeout(() => {
      focusMezzoInTable(id);
      router.replace(pathname, { scroll: false });
    }, 100);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router, focusMezzoInTable]);

  useEffect(() => {
    if (!anyOverlay) return;
    const gap = window.innerWidth - document.documentElement.clientWidth;
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
  }, [anyOverlay]);

  useEffect(() => {
    if (!anyOverlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setHubMezzo(null);
      setStoricoMezzo(null);
      setNuovoOpen(false);
      setEditMezzo(null);
      setLogOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anyOverlay]);

  const storicoRows = useMemo(() => {
    if (!storicoMezzo) return [];
    const rows = [...(interventiByMezzoId.get(storicoMezzo.id) ?? [])];
    rows.sort((a, b) => {
      const ta = new Date(a.dataIngresso).getTime();
      const tb = new Date(b.dataIngresso).getTime();
      return storicoSortDesc ? tb - ta : ta - tb;
    });
    return rows;
  }, [storicoMezzo, interventiByMezzoId, storicoSortDesc]);

  const storicoRiepilogo = useMemo(() => {
    if (!storicoMezzo) return null;
    const rows = interventiByMezzoId.get(storicoMezzo.id) ?? [];
    return {
      n12: interventiUltimi12Mesi(rows, MEZZI_OGGI_DEMO),
      mediaFermo: mediaGiorniFermoInterventi(rows),
      ultimo: ultimoInterventoIso(rows),
    };
  }, [storicoMezzo, interventiByMezzoId]);

  function submitNuovo(e: React.FormEvent) {
    e.preventDefault();
    const marca = nuovoForm.marca.trim();
    const mat = nuovoForm.matricola.trim();
    if (!marca || !nuovoForm.cliente.trim() || !mat) {
      window.alert("Compila almeno cliente, marca e matricola.");
      return;
    }
    createMut.mutate(formToMezzoInsert(nuovoForm), {
      onSuccess: (row) => {
        setNuovoForm(getEmptyNuovo());
        setNuovoOpen(false);
        flashRow(row.id);
      },
      onError: (err) => window.alert(err.message),
    });
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editMezzo) return;
    const marca = editForm.marca.trim();
    const mat = editForm.matricola.trim();
    if (!marca || !editForm.cliente.trim() || !mat) {
      window.alert("Compila almeno cliente, marca e matricola.");
      return;
    }
    const id = editMezzo.id;
    updateMut.mutate(
      { id, data: formToMezzoUpdate(editForm) },
      {
        onSuccess: () => {
          setEditMezzo(null);
          setHubMezzo(null);
          flashRow(id);
        },
        onError: (err) => window.alert(err.message),
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Mezzi"
        actions={
          <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
              title="Storico modifiche anagrafica mezzi"
            >
              <IconGestionaleLog />
              <span className="sr-only">Log modifiche</span>
            </button>
          </div>
        }
      />

      <div className={dsStackPage}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Nodi hub (anagrafica + flussi)</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{kpiTotali}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Con documenti collegati</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-orange-600 dark:text-orange-400">{kpiConDocumenti}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Con intervento ultimi 12 mesi</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">{kpiInterventi}</p>
          </div>
        </div>

        <ShellCard title="Parco mezzi">
          <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setNuovoForm(getEmptyNuovo());
                setNuovoOpen(true);
              }}
              className={`${erpBtnNuovaLavorazione} shrink-0`}
            >
              <span className="text-lg font-bold leading-none" aria-hidden>
                +
              </span>
              Nuovo mezzo
            </button>
          </div>

          <MezziFilters
            search={search}
            onSearch={setSearch}
            filtroCliente={filtroCliente}
            onFiltroCliente={setFiltroCliente}
            filtroMarca={filtroMarca}
            onFiltroMarca={setFiltroMarca}
            filtroModello={filtroModello}
            onFiltroModello={setFiltroModello}
            filtroTarga={filtroTarga}
            onFiltroTarga={setFiltroTarga}
            filtroNumeroScuderia={filtroNumeroScuderia}
            onFiltroNumeroScuderia={setFiltroNumeroScuderia}
          />

          {mezziError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
              <p>{mezziErr?.message ?? "Errore caricamento mezzi."}</p>
              <button type="button" className={`${erpBtnNeutral} mt-2`} onClick={() => void refetchMezzi()}>
                Riprova
              </button>
            </div>
          ) : null}

          <div className="mt-4">
            {mezziLoading ? (
              <p className="text-sm text-zinc-500">Caricamento…</p>
            ) : (
              <MezziTable
                rows={pagedSorted}
                interventiByMezzoId={interventiByMezzoId}
                inOfficina={inOfficina}
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                flashRowId={flashRowId}
                onHub={setHubMezzo}
                onStorico={setStoricoMezzo}
              />
            )}
          </div>
          {showPager ? (
            <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
          ) : (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{sorted.length} risultati</p>
          )}
        </ShellCard>
      </div>

      {hubMezzo ? (
        <MezziHubDetailModal
          mezzo={hubMezzo}
          onClose={() => setHubMezzo(null)}
          onEdit={() => {
            const h = hubMezzo;
            setHubMezzo(null);
            setEditMezzo(h);
            setEditForm(gestitoToForm(h));
          }}
          onOpenStoricoLavorazioni={() => {
            const h = hubMezzo;
            setHubMezzo(null);
            setStoricoMezzo(h);
          }}
        />
      ) : null}

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
          <aside className={gestionaleLogPanelAsideClass} aria-label="Log modifiche mezzi" onMouseDown={(e) => e.stopPropagation()}>
            <div className={gestionaleLogPanelHeaderClass}>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log modifiche</h2>
              <button type="button" onClick={() => setLogOpen(false)} className={erpBtnNeutral}>
                Chiudi
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
              <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 flex-1`}>
                {logQuery.isLoading ? (
                  <p className="text-sm text-zinc-500">Caricamento…</p>
                ) : logEntriesUi.length === 0 ? (
                  <GestionaleLogEmpty message="Nessuna modifica registrata su Supabase." />
                ) : (
                  <GestionaleLogList>
                    {pagedLogEntries.map((e) => {
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
                )}
              </div>
              {showLogPager ? (
                <TablePagination page={logPage} pageCount={logPageCount} onPageChange={setLogPage} label={logPagerLabel} />
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {storicoMezzo ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setStoricoMezzo(null);
          }}
        >
          <div
            className="flex max-h-[min(92vh,760px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mezzo-storico-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h2 id="mezzo-storico-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Storico interventi —{" "}
                {displayIdent(storicoMezzo.targa) !== "—"
                  ? storicoMezzo.targa
                  : [storicoMezzo.marca, displayIdent(storicoMezzo.modello)].filter((x) => x && x !== "—").join(" ") || "Mezzo"}
              </h2>
              <button type="button" className={erpBtnNeutral} onClick={() => setStoricoMezzo(null)}>
                Chiudi
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              {storicoRiepilogo ? (
                <div className="mb-4 grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800/40 sm:grid-cols-3">
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-zinc-500">Ultimi 12 mesi</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{storicoRiepilogo.n12}</p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-zinc-500">Media giorni fermo</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {storicoRiepilogo.mediaFermo ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-zinc-500">Ultimo intervento</p>
                    <p className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
                      {storicoRiepilogo.ultimo ? formatItDateTime(storicoRiepilogo.ultimo) : "—"}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase text-zinc-500">Ordina per data ingresso</span>
                <button type="button" onClick={() => setStoricoSortDesc((v) => !v)} className={erpBtnNeutral}>
                  {storicoSortDesc ? "Più recente prima" : "Più vecchio prima"}
                </button>
                <button type="button" className={`${erpBtnSoftOrange} ml-auto`} onClick={() => focusMezzoInTable(storicoMezzo.id)}>
                  Vai al mezzo in tabella
                </button>
              </div>
              <div className={`${dsTableWrap} ${dsScrollbar}`}>
                <table className={`${dsTable} w-full min-w-[880px] text-left text-xs text-zinc-900 dark:text-zinc-100`}>
                  <thead className={`border-b border-zinc-200 dark:border-zinc-700 ${dsTableHead}`}>
                    <tr>
                      <th className="px-2 py-2 font-semibold uppercase tracking-wide text-zinc-500">Ingresso</th>
                      <th className="px-2 py-2 font-semibold uppercase tracking-wide text-zinc-500">Completamento</th>
                      <th className="px-2 py-2 font-semibold uppercase tracking-wide text-zinc-500">Durata</th>
                      <th className="px-2 py-2 font-semibold uppercase tracking-wide text-zinc-500">Tipo / note</th>
                      <th className="px-2 py-2 font-semibold uppercase tracking-wide text-zinc-500">Priorità</th>
                      <th className="px-2 py-2 font-semibold uppercase tracking-wide text-zinc-500">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storicoRows.length === 0 ? (
                      <tr className={dsTableRow}>
                        <td colSpan={6} className="px-2 py-6 text-center text-zinc-500">
                          Nessun intervento collegato in Lavorazioni.
                        </td>
                      </tr>
                    ) : (
                      storicoRows.map((r) => (
                        <tr key={r.id} className={dsTableRow}>
                          <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-[11px]">
                            <button
                              type="button"
                              className={`text-left font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-300 ${erpFocus}`}
                              onClick={() => focusMezzoInTable(storicoMezzo.id)}
                            >
                              {formatItDateTime(r.dataIngresso)}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-[11px]">
                            {r.dataCompletamento ? formatItDateTime(r.dataCompletamento) : "—"}
                          </td>
                          <td className="px-2 py-2 align-top tabular-nums">{r.durataGiorniLabel}</td>
                          <td className="max-w-[260px] px-2 py-2 align-top">
                            <div className="font-medium">{r.tipoIntervento}</div>
                            <div className="mt-0.5 text-zinc-600 dark:text-zinc-400">{r.descrizione}</div>
                          </td>
                          <td className="px-2 py-2 align-top">{r.prioritaLabel}</td>
                          <td className="px-2 py-2 align-top">{r.statoFinale}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {nuovoOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setNuovoOpen(false);
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mezzo-nuovo-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h2 id="mezzo-nuovo-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Nuovo mezzo
              </h2>
              <button type="button" className={erpBtnNeutral} onClick={() => setNuovoOpen(false)}>
                Chiudi
              </button>
            </div>
            <form onSubmit={submitNuovo} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-4">
                <MezzoFormFields form={nuovoForm} setForm={setNuovoForm} />
              </div>
              <div className="shrink-0 border-t border-zinc-100 p-4 dark:border-zinc-800">
                <button type="submit" disabled={createMut.isPending} className={`${erpBtnAccent} w-full disabled:opacity-60`}>
                  {createMut.isPending ? "Salvataggio…" : "Salva mezzo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editMezzo ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditMezzo(null);
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mezzo-edit-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h2 id="mezzo-edit-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Modifica mezzo
              </h2>
              <button type="button" className={erpBtnNeutral} onClick={() => setEditMezzo(null)}>
                Chiudi
              </button>
            </div>
            <form onSubmit={submitEdit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-4">
                <MezzoFormFields form={editForm} setForm={setEditForm} />
              </div>
              <div className="shrink-0 border-t border-zinc-100 p-4 dark:border-zinc-800">
                <button type="submit" disabled={updateMut.isPending} className={`${erpBtnAccent} w-full disabled:opacity-60`}>
                  {updateMut.isPending ? "Salvataggio…" : "Salva modifiche"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

type MezzoForm = ReturnType<typeof getEmptyNuovo>;

function MezzoFormFields({
  form,
  setForm,
}: {
  form: MezzoForm;
  setForm: React.Dispatch<React.SetStateAction<MezzoForm>>;
}) {
  const input =
    "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950";
  return (
    <>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Cliente *
        <input
          required
          value={form.cliente}
          onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
          className={input}
          placeholder="Ragione sociale o nome"
        />
      </label>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Utilizzatore
        <input value={form.utilizzatore} onChange={(e) => setForm((f) => ({ ...f, utilizzatore: e.target.value }))} className={input} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Marca *
          <input
            required
            value={form.marca}
            onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
            className={input}
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Modello
          <input value={form.modello} onChange={(e) => setForm((f) => ({ ...f, modello: e.target.value }))} className={input} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Targa
          <input
            value={form.targa}
            onChange={(e) => setForm((f) => ({ ...f, targa: e.target.value }))}
            className={`${input} font-mono`}
            placeholder="—"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Matricola *
          <input
            required
            value={form.matricola}
            onChange={(e) => setForm((f) => ({ ...f, matricola: e.target.value }))}
            className={`${input} font-mono`}
          />
        </label>
      </div>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        N. scuderia
        <input
          value={form.numeroScuderia}
          onChange={(e) => setForm((f) => ({ ...f, numeroScuderia: e.target.value }))}
          className={`${input} font-mono`}
          placeholder="—"
        />
      </label>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Anno
        <input type="number" min={1980} max={2035} value={form.anno} onChange={(e) => setForm((f) => ({ ...f, anno: e.target.value }))} className={input} />
      </label>
    </>
  );
}
