"use client";

import "./lavorazioni-scroll.css";
import "./lavorazioni-select-theme.css";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { MobileFilterDrawer } from "@/components/gestionale/mobile-filter-drawer";
import { LavorazioneCreateModal } from "@/components/gestionale/lavorazioni/lavorazione-create-modal";
import { LavorazioneDetailModal } from "@/components/gestionale/lavorazioni/lavorazione-detail-modal";
import { LavorazioneEditModal } from "@/components/gestionale/lavorazioni/lavorazione-edit-modal";
import { InlineSelectField } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import { buildPreventiviArchivioFilterHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { lavorazioneMatchesMezzo } from "@/lib/mezzi/lavorazioni-sync";
import { lavRowToMatchShape } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { getMezziReportSnapshot } from "@/lib/mezzi/mezzi-report-sync";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { Q_FOCUS_LAV_ROW, Q_FOCUS_MEZZO } from "@/lib/navigation/dashboard-log-links";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { prioritaDisplayColor, statoThemeColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import { isStatoLavorazioneChiusoDb } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { dsInput, dsLabel, dsPageToolbarBtn, dsStackPage, dsScrollbar, dsTable, dsTableRow, dsTableWrap, dsTableThSticky } from "@/lib/ui/design-system";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  LAVORAZIONI_STATI_CHIUSE,
  LAVORAZIONI_STATI_IN_CORSO,
  type LavorazioneFilters,
  type LavorazioneListRow,
  type LavorazioneUpdate,
} from "@/src/services/lavorazioni.service";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useLavorazioneRemoveMutation, useLavorazioneUpdateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import { useAuth } from "@/context/auth-context";
import {
  erpBtnAccent,
  erpBtnIcon,
  erpBtnNeutral,
  erpBtnNuovaLavorazione,
  erpFocus,
  FilterSelectWrap,
  prioritaLabel,
  prioritaPillShellClass,
  selectLavorazioniFilter,
  statoPillShellClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";

function fmtDay(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

function macchinaLabel(row: LavorazioneListRow): string {
  const m = row.mezzo;
  return m ? `${m.marca} ${m.modello}`.trim() : "—";
}

function clienteLabel(row: LavorazioneListRow): string {
  return row.mezzo?.cliente?.trim() || "—";
}

function mezzoIdent(row: LavorazioneListRow): string {
  const m = row.mezzo;
  const t = m?.targa?.trim() || "—";
  const mat = m?.matricola?.trim() || "—";
  const sc = m?.numero_scuderia?.trim() || "—";
  return `${t} · ${mat} · ${sc}`;
}

const PRIORITA_OPTS: PrioritaLavorazione[] = ["bassa", "media", "alta", "urgente"];

/** Stati selezionabili in tabella (in corso + chiusura). */
const STATI_RAPIDI: StatoLavorazione[] = [...LAVORAZIONI_STATI_IN_CORSO, ...LAVORAZIONI_STATI_CHIUSE];

function canDeleteLavorazioneBozza(row: LavorazioneListRow): boolean {
  return row.stato === "bozza";
}

function prioHex(p: PrioritaLavorazione): string {
  if (p === "urgente") return "#b91c1c";
  return prioritaDisplayColor(p as PrioritaLav, null);
}

function ymdEndDayIso(ymd: string): string {
  const t = ymd.trim();
  return t.length <= 10 ? `${t}T23:59:59.999Z` : t;
}

function todayYmd(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

type SortPhase = "asc" | "desc" | "natural";
type SortKeyAtt = "macchina" | "cliente" | "note" | "stato" | "priorita" | "ingresso";
type SortKeyCh = "macchina" | "mezzoIdent" | "cliente" | "ingresso" | "uscita";

function cmpStr(a: string, b: string): number {
  return a.localeCompare(b, "it", { sensitivity: "base" });
}

function cmpAtt(a: LavorazioneListRow, b: LavorazioneListRow, k: SortKeyAtt, phase: SortPhase): number {
  const dir = phase === "desc" ? -1 : 1;
  const t = (x: number) => x * dir;
  if (k === "macchina") return t(cmpStr(macchinaLabel(a), macchinaLabel(b)));
  if (k === "cliente") return t(cmpStr(clienteLabel(a), clienteLabel(b)));
  if (k === "note") return t(cmpStr((a.note ?? "").trim(), (b.note ?? "").trim()));
  if (k === "stato") return t(cmpStr(a.stato, b.stato));
  if (k === "priorita") return t(cmpStr(a.priorita, b.priorita));
  const da = new Date(a.data_ingresso ?? a.created_at).getTime();
  const db = new Date(b.data_ingresso ?? b.created_at).getTime();
  return t(da === db ? 0 : da < db ? -1 : 1);
}

function cmpCh(a: LavorazioneListRow, b: LavorazioneListRow, k: SortKeyCh, phase: SortPhase): number {
  const dir = phase === "desc" ? -1 : 1;
  const t = (x: number) => x * dir;
  if (k === "macchina") return t(cmpStr(macchinaLabel(a), macchinaLabel(b)));
  if (k === "mezzoIdent") return t(cmpStr(mezzoIdent(a), mezzoIdent(b)));
  if (k === "cliente") return t(cmpStr(clienteLabel(a), clienteLabel(b)));
  if (k === "ingresso") {
    const da = new Date(a.data_ingresso ?? a.created_at).getTime();
    const db = new Date(b.data_ingresso ?? b.created_at).getTime();
    return t(da === db ? 0 : da < db ? -1 : 1);
  }
  const ua = new Date(a.data_uscita ?? a.updated_at).getTime();
  const ub = new Date(b.data_uscita ?? b.updated_at).getTime();
  return t(ua === ub ? 0 : ua < ub ? -1 : 1);
}

function SortTh({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
}: {
  label: string;
  columnKey: string;
  sortColumn: string | null;
  sortPhase: SortPhase;
  onSort: (k: any) => void;
}) {
  const on = sortColumn === columnKey;
  const arrow = !on || sortPhase === "natural" ? "" : sortPhase === "asc" ? " ↑" : " ↓";
  return (
    <th className={`${dsTableThSticky} px-3 py-2 text-left text-xs font-semibold uppercase text-[color:var(--cab-text-muted)]`}>
      <button type="button" className={`inline-flex items-center gap-1 ${erpFocus}`} onClick={() => onSort(columnKey)}>
        {label}
        <span className="tabular-nums text-[10px] font-bold text-zinc-400">{arrow}</span>
      </button>
    </th>
  );
}

function navMezzoFilterBadgeLabel(m: MezzoGestito): string {
  const t = m.targa?.trim();
  if (t && t !== "—") return t;
  const mat = m.matricola?.trim();
  if (mat && mat !== "—") return mat;
  const sc = m.numeroScuderia?.trim();
  if (sc) return `Sc. ${sc}`;
  const mm = `${m.marca} ${m.modello}`.trim();
  return mm || m.id;
}

export function LavorazioniView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const updateLav = useLavorazioneUpdateMutation();
  const removeLav = useLavorazioneRemoveMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<LavorazioneListRow | null>(null);
  const [closeRow, setCloseRow] = useState<LavorazioneListRow | null>(null);
  const [closeYmd, setCloseYmd] = useState(() => todayYmd());
  const [closeStato, setCloseStato] = useState<StatoLavorazione>("completata");

  const [searchInput, setSearchInput] = useState("");
  const searchDeferred = useDeferredValue(searchInput.trim());

  const [storicoSearchInput, setStoricoSearchInput] = useState("");
  const storicoSearchDef = useDeferredValue(storicoSearchInput.trim());

  const [meseYyyyMm, setMeseYyyyMm] = useState("__tutti__");
  const [storicoFiltersOpen, setStoricoFiltersOpen] = useState(false);

  const [sortColA, setSortColA] = useState<SortKeyAtt | null>(null);
  const [sortPhaseA, setSortPhaseA] = useState<SortPhase>("natural");

  const [sortColC, setSortColC] = useState<SortKeyCh | null>(null);
  const [sortPhaseC, setSortPhaseC] = useState<SortPhase>("natural");

  const [hubOpenId, setHubOpenId] = useState<string | null>(null);
  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const flashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [navMezzoFilter, setNavMezzoFilter] = useState<MezzoGestito | null>(null);
  const [navBulkFlashIds, setNavBulkFlashIds] = useState<Set<string>>(() => new Set());
  const navFlashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uscitaRange = useMemo((): Pick<LavorazioneFilters, "data_uscita_da" | "data_uscita_a"> => {
    if (meseYyyyMm === "__tutti__") return {};
    const [yStr, mStr] = meseYyyyMm.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return {};
    const last = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, "0");
    return {
      data_uscita_da: `${y}-${mm}-01`,
      data_uscita_a: `${y}-${mm}-${String(last).padStart(2, "0")}`,
    };
  }, [meseYyyyMm]);

  const mezzoFilterPart = useMemo((): Pick<LavorazioneFilters, "mezzo_id"> | Record<string, never> => {
    return navMezzoFilter?.id ? { mezzo_id: navMezzoFilter.id } : {};
  }, [navMezzoFilter?.id]);

  const filtersAttive = useMemo(
    (): LavorazioneFilters => ({
      includeMezzo: true,
      ...mezzoFilterPart,
      stati_in: [...LAVORAZIONI_STATI_IN_CORSO],
      ...(searchDeferred.length > 0 ? { search: searchDeferred } : {}),
    }),
    [mezzoFilterPart, searchDeferred],
  );

  const filtersChiuse = useMemo(
    (): LavorazioneFilters => ({
      includeMezzo: true,
      ...mezzoFilterPart,
      stati_in: [...LAVORAZIONI_STATI_CHIUSE],
      ...uscitaRange,
      ...(storicoSearchDef.length > 0 ? { search: storicoSearchDef } : {}),
    }),
    [mezzoFilterPart, uscitaRange, storicoSearchDef],
  );

  const attiveQuery = useLavorazioniList(filtersAttive, { staleTime: 30_000 });
  const chiuseQuery = useLavorazioniList(filtersChiuse, { staleTime: 30_000 });

  const attiveRows = attiveQuery.data ?? [];
  const chiuseRows = chiuseQuery.data ?? [];

  const mesiChiuse = useMemo(() => {
    const s = new Set<string>();
    for (const r of chiuseRows) {
      const du = r.data_uscita?.trim();
      if (du && du.length >= 7) s.add(du.slice(0, 7));
    }
    return [...s].sort((a, b) => b.localeCompare(a, "it"));
  }, [chiuseRows]);

  const flashRow = useCallback((id: string) => {
    if (flashClearRef.current) clearTimeout(flashClearRef.current);
    setFlashRowId(id);
    flashClearRef.current = setTimeout(() => {
      setFlashRowId(null);
      flashClearRef.current = null;
    }, 1400);
  }, []);

  const createdBy = user?.id ?? null;

  useEffect(() => {
    if (!closeRow) return;
    setCloseYmd(todayYmd());
    setCloseStato("completata");
  }, [closeRow?.id]);

  const mutErr = updateLav.isError ? updateLav.error?.message : removeLav.isError ? removeLav.error?.message : null;
  const mutPending = updateLav.isPending || removeLav.isPending;

  const onStatoRow = useCallback(
    (row: LavorazioneListRow, next: string) => {
      const nuovo = next as StatoLavorazione;
      const data: LavorazioneUpdate = { stato: nuovo };
      if (LAVORAZIONI_STATI_CHIUSE.includes(nuovo)) {
        data.data_uscita = row.data_uscita?.trim() || ymdEndDayIso(todayYmd());
      } else {
        data.data_uscita = null;
      }
      updateLav.mutate(
        { id: row.id, data },
        {
          onSuccess: () => flashRow(row.id),
        },
      );
    },
    [updateLav, flashRow],
  );

  const onPrioritaRow = useCallback(
    (row: LavorazioneListRow, next: string) => {
      updateLav.mutate(
        { id: row.id, data: { priorita: next as PrioritaLavorazione } },
        { onSuccess: () => flashRow(row.id) },
      );
    },
    [updateLav, flashRow],
  );

  const onDeleteRow = useCallback(
    (row: LavorazioneListRow) => {
      const ok = window.confirm(
        `Eliminare definitivamente la lavorazione «${macchinaLabel(row)}»? L’operazione non è annullabile.`,
      );
      if (!ok) return;
      removeLav.mutate(row.id, {
        onSuccess: () => {
          setHubOpenId((cur) => (cur === row.id ? null : cur));
        },
      });
    },
    [removeLav],
  );

  function submitCloseLavorazione() {
    if (!closeRow) return;
    updateLav.mutate(
      { id: closeRow.id, data: { stato: closeStato, data_uscita: ymdEndDayIso(closeYmd) } },
      {
        onSuccess: () => {
          flashRow(closeRow.id);
          setCloseRow(null);
        },
      },
    );
  }

  useEffect(() => {
    return () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current);
      if (navFlashClearRef.current) clearTimeout(navFlashClearRef.current);
    };
  }, []);

  useEffect(() => {
    const id = searchParams.get(Q_FOCUS_LAV_ROW)?.trim();
    if (!id) return;
    const t = window.setTimeout(() => {
      setHubOpenId(id);
      flashRow(id);
      router.replace(pathname, { scroll: false });
    }, 80);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router, flashRow]);

  useEffect(() => {
    const raw = searchParams.get(Q_FOCUS_MEZZO)?.trim();
    if (!raw) return;
    const t = window.setTimeout(() => {
      if (raw.startsWith("hub-lav-")) {
        const lavId = raw.slice("hub-lav-".length);
        setHubOpenId(lavId);
        flashRow(lavId);
        router.replace(pathname, { scroll: false });
        return;
      }
      router.replace(pathname, { scroll: false });
      const mezzi = getMezziReportSnapshot();
      const mezzo = mezzi.find((m) => m.id === raw);
      if (!mezzo) return;
      setNavMezzoFilter({ ...mezzo });
      const hitA = attiveRows.filter((lav) => lavorazioneMatchesMezzo(mezzo, lavRowToMatchShape(lav)));
      const hitC = chiuseRows.filter((lav) => lavorazioneMatchesMezzo(mezzo, lavRowToMatchShape(lav)));
      const ids = new Set<string>([...hitA.map((r) => r.id), ...hitC.map((r) => r.id)]);
      setNavBulkFlashIds(ids);
      if (navFlashClearRef.current) clearTimeout(navFlashClearRef.current);
      navFlashClearRef.current = setTimeout(() => {
        setNavBulkFlashIds(new Set());
        navFlashClearRef.current = null;
      }, 2000);
    }, 80);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router, flashRow, attiveRows, chiuseRows]);

  function cycleSort<T extends string>(
    curCol: T | null,
    setCol: (c: T | null) => void,
    setPhase: Dispatch<SetStateAction<SortPhase>>,
    k: T,
  ) {
    if (curCol !== k) {
      setCol(k);
      setPhase("asc");
      return;
    }
    setPhase((prev) => {
      if (prev === "asc") return "desc";
      if (prev === "desc") {
        setCol(null);
        return "natural";
      }
      return "asc";
    });
  }

  const sortedAttive = useMemo(() => {
    const rows = [...attiveRows];
    rows.sort((a, b) => {
      if (sortPhaseA === "natural" || sortColA === null) {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        if (tb !== ta) return tb - ta;
        return b.id.localeCompare(a.id);
      }
      const p = cmpAtt(a, b, sortColA, sortPhaseA);
      if (p !== 0) return p;
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });
    return rows;
  }, [attiveRows, sortColA, sortPhaseA]);

  const sortedChiuse = useMemo(() => {
    const rows = [...chiuseRows];
    rows.sort((a, b) => {
      if (sortPhaseC === "natural" || sortColC === null) {
        const ta = new Date(a.data_uscita ?? a.updated_at).getTime();
        const tb = new Date(b.data_uscita ?? b.updated_at).getTime();
        if (tb !== ta) return tb - ta;
        return b.id.localeCompare(a.id);
      }
      const p = cmpCh(a, b, sortColC, sortPhaseC);
      if (p !== 0) return p;
      const ta = new Date(a.data_uscita ?? a.updated_at).getTime();
      const tb = new Date(b.data_uscita ?? b.updated_at).getTime();
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });
    return rows;
  }, [chiuseRows, sortColC, sortPhaseC]);

  const listPageSize = useResponsiveListPageSize();

  const {
    page: pageA,
    setPage: setPageA,
    pageCount: pageCountA,
    sliceItems: sliceA,
    showPager: showPagerA,
    label: labelA,
    resetPage: resetPageA,
  } = useClientPagination(sortedAttive.length, listPageSize);
  useEffect(() => {
    resetPageA();
  }, [filtersAttive, sortedAttive.length, listPageSize, resetPageA]);
  const pagedAttive = useMemo(() => sliceA(sortedAttive), [sortedAttive, sliceA, pageA]);

  const {
    page: pageC,
    setPage: setPageC,
    pageCount: pageCountC,
    sliceItems: sliceC,
    showPager: showPagerC,
    label: labelC,
    resetPage: resetPageC,
  } = useClientPagination(sortedChiuse.length, listPageSize);
  useEffect(() => {
    resetPageC();
  }, [filtersChiuse, sortedChiuse.length, listPageSize, resetPageC]);
  const pagedChiuse = useMemo(() => sliceC(sortedChiuse), [sortedChiuse, sliceC, pageC]);

  function resetStoricoFilters() {
    setStoricoSearchInput("");
    setMeseYyyyMm("__tutti__");
  }

  const loading = attiveQuery.isLoading || chiuseQuery.isLoading;
  const loadErr = attiveQuery.isError ? attiveQuery.error?.message : chiuseQuery.isError ? chiuseQuery.error?.message : null;

  return (
    <>
      <PageHeader title="Lavorazioni" />

      <div className={dsStackPage}>
        {loadErr ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {loadErr}
          </div>
        ) : null}

        {mutErr ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {mutErr}
          </div>
        ) : null}

        {navMezzoFilter ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50/90 px-3 py-2 text-sm text-orange-950 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-50">
            <span>
              Filtro mezzo: <span className="font-semibold tabular-nums">{navMezzoFilterBadgeLabel(navMezzoFilter)}</span>
            </span>
            <button
              type="button"
              onClick={() => setNavMezzoFilter(null)}
              className={`${erpBtnNeutral} shrink-0 font-semibold`}
              aria-label="Rimuovi filtro mezzo"
            >
              × Rimuovi
            </button>
          </div>
        ) : null}

        <ShellCard title="Lavorazioni in corso">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={erpBtnNuovaLavorazione}
              disabled={mutPending || !createdBy}
              title={!createdBy ? "Accedi per creare una lavorazione." : undefined}
            >
              + Nuova lavorazione
            </button>
            {mutPending ? <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Salvataggio in corso…</span> : null}
            {!createdBy ? (
              <span className="text-xs text-amber-800 dark:text-amber-200">Accedi per registrare nuove lavorazioni.</span>
            ) : null}
          </div>
          <label className="mb-4 flex max-w-md flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            Cerca (note)
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Testo nelle note…"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>

          {loading ? <p className="text-sm text-zinc-500">Caricamento…</p> : null}

          <div className={`lavorazioni-scroll-scope ${dsTableWrap} ${dsScrollbar} hidden md:block`}>
            <table className={`${dsTable} min-w-[1280px] w-full table-fixed`}>
              <thead className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                <tr>
                  <SortTh
                    label="Macchina"
                    columnKey="macchina"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <SortTh
                    label="Cliente"
                    columnKey="cliente"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <SortTh
                    label="Note"
                    columnKey="note"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <SortTh
                    label="Stato"
                    columnKey="stato"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <SortTh
                    label="Priorità"
                    columnKey="priorita"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <SortTh
                    label="Ingresso"
                    columnKey="ingresso"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <th className={`${dsTableThSticky} px-3 py-2 text-right text-xs font-semibold uppercase text-[color:var(--cab-text-muted)]`}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedAttive.length === 0 ? (
                  <tr className={dsTableRow}>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      {navMezzoFilter ? "Nessuna lavorazione in corso per il mezzo filtrato." : "Nessuna lavorazione in corso."}
                    </td>
                  </tr>
                ) : (
                  pagedAttive.map((row) => {
                    const flash = flashRowId === row.id || navBulkFlashIds.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        id={`lavorazioni-row-${row.id}`}
                        className={[
                          dsTableRow,
                          "h-14 bg-white dark:bg-zinc-900/40",
                          flash
                            ? "bg-orange-50/90 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.45)] ring-2 ring-orange-400/35 dark:bg-orange-950/35 dark:shadow-[inset_0_0_0_1px_rgba(234,88,12,0.35)] dark:ring-orange-500/30"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td className="px-3 align-middle">
                          <div className="font-medium leading-snug text-zinc-900 dark:text-zinc-100">{macchinaLabel(row)}</div>
                          <div className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">{mezzoIdent(row)}</div>
                        </td>
                        <td className="max-w-[220px] px-3 align-middle text-sm text-zinc-800 dark:text-zinc-100">{clienteLabel(row)}</td>
                        <td className="max-w-[240px] px-3 align-middle text-sm text-zinc-600 dark:text-zinc-300">
                          <span className="line-clamp-2">{(row.note ?? "").trim() || "—"}</span>
                        </td>
                        <td className="px-3 align-middle text-sm">
                          <InlineSelectField
                            shellClass={statoPillShellClass()}
                            shellStyle={readablePillStyleFromHex(statoThemeColor(row.stato))}
                            value={row.stato}
                            onChange={(v) => onStatoRow(row, v)}
                            ariaLabel={`Stato — ${macchinaLabel(row)}`}
                            disabled={mutPending || loading}
                            title={labelLavorazioneStatoDb(row.stato)}
                          >
                            {STATI_RAPIDI.map((s) => (
                              <option key={s} value={s}>
                                {labelLavorazioneStatoDb(s)}
                              </option>
                            ))}
                          </InlineSelectField>
                        </td>
                        <td className="px-3 align-middle text-sm">
                          <InlineSelectField
                            shellClass={prioritaPillShellClass()}
                            shellStyle={readablePillStyleFromHex(prioHex(row.priorita))}
                            value={row.priorita}
                            onChange={(v) => onPrioritaRow(row, v)}
                            ariaLabel={`Priorità — ${macchinaLabel(row)}`}
                            disabled={mutPending || loading}
                            title={prioritaLabel(row.priorita)}
                          >
                            {PRIORITA_OPTS.map((p) => (
                              <option key={p} value={p}>
                                {prioritaLabel(p)}
                              </option>
                            ))}
                          </InlineSelectField>
                        </td>
                        <td className="px-3 align-middle text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
                          {fmtDay(row.data_ingresso ?? row.created_at)}
                        </td>
                        <td className="px-3 align-middle text-right">
                          <div className="inline-flex max-w-[22rem] flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              className={`${erpBtnIcon} gap-1 px-2.5`}
                              title="Modifica note e data ingresso"
                              disabled={mutPending || loading}
                              onClick={() => setEditRow(row)}
                            >
                              Modifica
                            </button>
                            <button
                              type="button"
                              className={`${erpBtnIcon} gap-1 px-2.5`}
                              title="Chiudi con data uscita"
                              disabled={mutPending || loading}
                              onClick={() => setCloseRow(row)}
                            >
                              Chiudi
                            </button>
                            {canDeleteLavorazioneBozza(row) ? (
                              <button
                                type="button"
                                className={`${erpBtnIcon} gap-1 px-2.5 text-red-700 dark:text-red-300`}
                                title="Elimina bozza"
                                disabled={mutPending || loading}
                                onClick={() => onDeleteRow(row)}
                              >
                                Elimina
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className={`${erpBtnIcon} gap-1 px-2.5`}
                              title="Apri hub lavorazione"
                              disabled={mutPending}
                              onClick={() => setHubOpenId(row.id)}
                            >
                              Hub
                            </button>
                            <Link
                              href={buildPreventiviArchivioFilterHref(row.id, "attiva")}
                              className={`${erpBtnIcon} gap-1 px-2.5 no-underline`}
                              title="Preventivi"
                            >
                              Prev.
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-3 md:hidden">
            {pagedAttive.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {navMezzoFilter ? "Nessuna lavorazione in corso per il mezzo filtrato." : "Nessuna lavorazione in corso."}
              </p>
            ) : (
              pagedAttive.map((row) => (
                <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{macchinaLabel(row)}</p>
                  <p className="text-xs text-zinc-500">{mezzoIdent(row)}</p>
                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">{clienteLabel(row)}</p>
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{(row.note ?? "").trim() || "—"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Stato</span>
                    <InlineSelectField
                      shellClass={statoPillShellClass()}
                      shellStyle={readablePillStyleFromHex(statoThemeColor(row.stato))}
                      value={row.stato}
                      onChange={(v) => onStatoRow(row, v)}
                      ariaLabel={`Stato — ${macchinaLabel(row)}`}
                      disabled={mutPending || loading}
                    >
                      {STATI_RAPIDI.map((s) => (
                        <option key={s} value={s}>
                          {labelLavorazioneStatoDb(s)}
                        </option>
                      ))}
                    </InlineSelectField>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Priorità</span>
                    <InlineSelectField
                      shellClass={prioritaPillShellClass()}
                      shellStyle={readablePillStyleFromHex(prioHex(row.priorita))}
                      value={row.priorita}
                      onChange={(v) => onPrioritaRow(row, v)}
                      ariaLabel={`Priorità — ${macchinaLabel(row)}`}
                      disabled={mutPending || loading}
                    >
                      {PRIORITA_OPTS.map((p) => (
                        <option key={p} value={p}>
                          {prioritaLabel(p)}
                        </option>
                      ))}
                    </InlineSelectField>
                  </div>
                  <p className="mt-2 text-xs tabular-nums text-zinc-500">
                    Ingresso: {fmtDay(row.data_ingresso ?? row.created_at)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={`${erpBtnIcon} px-3`} disabled={mutPending || loading} onClick={() => setEditRow(row)}>
                      Modifica
                    </button>
                    <button type="button" className={`${erpBtnIcon} px-3`} disabled={mutPending || loading} onClick={() => setCloseRow(row)}>
                      Chiudi
                    </button>
                    {canDeleteLavorazioneBozza(row) ? (
                      <button
                        type="button"
                        className={`${erpBtnIcon} px-3 text-red-700 dark:text-red-300`}
                        disabled={mutPending || loading}
                        onClick={() => onDeleteRow(row)}
                      >
                        Elimina
                      </button>
                    ) : null}
                    <button type="button" className={`${erpBtnIcon} px-3`} disabled={mutPending} onClick={() => setHubOpenId(row.id)}>
                      Hub
                    </button>
                    <Link href={buildPreventiviArchivioFilterHref(row.id, "attiva")} className={`${erpBtnIcon} px-3 no-underline`}>
                      Preventivi
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {showPagerA ? <TablePagination page={pageA} pageCount={pageCountA} onPageChange={setPageA} label={labelA} /> : null}
        </ShellCard>

        <ShellCard title="Archivio lavorazioni">
          <div className="mb-3 flex items-center justify-between gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setStoricoFiltersOpen(true)}
              className={`${dsPageToolbarBtn} min-h-11 flex-1 justify-center`}
            >
              Filtri archivio
            </button>
            <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">{sortedChiuse.length}</span> risultati
            </span>
          </div>

          <MobileFilterDrawer open={storicoFiltersOpen} onClose={() => setStoricoFiltersOpen(false)} title="Filtri archivio" onReset={resetStoricoFilters}>
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Cerca (note)
              <input
                value={storicoSearchInput}
                onChange={(e) => setStoricoSearchInput(e.target.value)}
                className="min-h-11 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Mese uscita
              <FilterSelectWrap>
                <select className={selectLavorazioniFilter} value={meseYyyyMm} onChange={(e) => setMeseYyyyMm(e.target.value)}>
                  <option value="__tutti__">Tutti</option>
                  {mesiChiuse.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </FilterSelectWrap>
            </label>
          </MobileFilterDrawer>

          <div className="mb-4 hidden flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end md:flex">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Cerca (note)
              <input
                value={storicoSearchInput}
                onChange={(e) => setStoricoSearchInput(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Mese uscita
              <FilterSelectWrap>
                <select className={selectLavorazioniFilter} value={meseYyyyMm} onChange={(e) => setMeseYyyyMm(e.target.value)}>
                  <option value="__tutti__">Tutti</option>
                  {mesiChiuse.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </FilterSelectWrap>
            </label>
          </div>

          <div className={`lavorazioni-scroll-scope ${dsTableWrap} ${dsScrollbar} hidden md:block`}>
            <table className={`${dsTable} min-w-[1100px] w-full table-fixed`}>
              <thead className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                <tr>
                  <SortTh
                    label="Macchina"
                    columnKey="macchina"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <SortTh
                    label="TARGA · MATRICOLA · SCUDERIA"
                    columnKey="mezzoIdent"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <SortTh
                    label="Cliente"
                    columnKey="cliente"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <SortTh
                    label="Ingresso"
                    columnKey="ingresso"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <SortTh
                    label="Uscita"
                    columnKey="uscita"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <th className={`${dsTableThSticky} px-3 py-2 text-right text-xs font-semibold uppercase text-[color:var(--cab-text-muted)]`}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedChiuse.length === 0 ? (
                  <tr className={dsTableRow}>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      Nessun record in archivio con i filtri correnti.
                    </td>
                  </tr>
                ) : (
                  pagedChiuse.map((row) => {
                    const flash = flashRowId === row.id || navBulkFlashIds.has(row.id);
                    const orig = isStatoLavorazioneChiusoDb(row.stato) ? "storico" : "attiva";
                    return (
                      <tr
                        key={row.id}
                        id={`lavorazioni-storico-row-${row.id}`}
                        className={[
                          dsTableRow,
                          "h-14 bg-white dark:bg-zinc-900/40",
                          flash
                            ? "bg-orange-50/90 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.45)] ring-2 ring-orange-400/35 dark:bg-orange-950/35 dark:shadow-[inset_0_0_0_1px_rgba(234,88,12,0.35)] dark:ring-orange-500/30"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td className="px-3 align-middle font-medium text-zinc-900 dark:text-zinc-100">{macchinaLabel(row)}</td>
                        <td className="px-3 align-middle text-xs text-zinc-600 dark:text-zinc-300">{mezzoIdent(row)}</td>
                        <td className="px-3 align-middle text-sm text-zinc-800 dark:text-zinc-100">{clienteLabel(row)}</td>
                        <td className="px-3 align-middle text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
                          {fmtDay(row.data_ingresso ?? row.created_at)}
                        </td>
                        <td className="px-3 align-middle text-sm tabular-nums text-zinc-700 dark:text-zinc-300">{fmtDay(row.data_uscita)}</td>
                        <td className="px-3 align-middle text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button type="button" className={`${erpBtnIcon} px-2.5`} onClick={() => setHubOpenId(row.id)}>
                              Hub
                            </button>
                            <Link href={buildPreventiviArchivioFilterHref(row.id, orig)} className={`${erpBtnIcon} px-2.5 no-underline`}>
                              Prev.
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-3 md:hidden">
            {pagedChiuse.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                Nessun record in archivio con i filtri correnti.
              </p>
            ) : (
              pagedChiuse.map((row) => {
              const orig = isStatoLavorazioneChiusoDb(row.stato) ? "storico" : "attiva";
              return (
                <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{macchinaLabel(row)}</p>
                  <p className="text-xs text-zinc-500">{mezzoIdent(row)}</p>
                  <p className="mt-2 text-sm">{clienteLabel(row)}</p>
                  <p className="mt-1 text-xs tabular-nums text-zinc-500">
                    {fmtDay(row.data_ingresso ?? row.created_at)} → {fmtDay(row.data_uscita)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={`${erpBtnIcon} px-3`} onClick={() => setHubOpenId(row.id)}>
                      Hub
                    </button>
                    <Link href={buildPreventiviArchivioFilterHref(row.id, orig)} className={`${erpBtnIcon} px-3 no-underline`}>
                      Preventivi
                    </Link>
                  </div>
                </div>
              );
            })
            )}
          </div>

          {showPagerC ? <TablePagination page={pageC} pageCount={pageCountC} onPageChange={setPageC} label={labelC} /> : null}
        </ShellCard>
      </div>

      {hubOpenId ? <LavorazioneDetailModal lavorazioneId={hubOpenId} onClose={() => setHubOpenId(null)} /> : null}

      <LavorazioneCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        createdBy={createdBy}
        onCreated={(id) => {
          flashRow(id);
          setHubOpenId(id);
        }}
      />

      {editRow ? <LavorazioneEditModal row={editRow} onClose={() => setEditRow(null)} /> : null}

      {closeRow ? (
        <LavorazioniModalShell onRequestClose={() => { if (!mutPending) setCloseRow(null); }}>
          <div className="flex max-h-[min(88dvh,480px)] flex-col overflow-hidden">
            <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Chiudi lavorazione</h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {macchinaLabel(closeRow)} — imposta data uscita e stato archivio.
              </p>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <label className="block">
                <span className={dsLabel}>Data uscita</span>
                <input
                  type="date"
                  className={`${dsInput} mt-1 w-full`}
                  value={closeYmd}
                  onChange={(e) => setCloseYmd(e.target.value)}
                  disabled={mutPending}
                />
              </label>
              <label className="block">
                <span className={dsLabel}>Stato finale</span>
                <select
                  className={`${dsInput} mt-1 w-full capitalize`}
                  value={closeStato}
                  onChange={(e) => setCloseStato(e.target.value as StatoLavorazione)}
                  disabled={mutPending}
                >
                  {LAVORAZIONI_STATI_CHIUSE.map((s) => (
                    <option key={s} value={s}>
                      {labelLavorazioneStatoDb(s)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <button type="button" className={erpBtnNeutral} disabled={mutPending} onClick={() => setCloseRow(null)}>
                Annulla
              </button>
              <button type="button" className={erpBtnAccent} disabled={mutPending || !closeYmd.trim()} onClick={() => submitCloseLavorazione()}>
                {mutPending ? "Salvataggio…" : "Conferma chiusura"}
              </button>
            </footer>
          </div>
        </LavorazioniModalShell>
      ) : null}
    </>
  );
}
