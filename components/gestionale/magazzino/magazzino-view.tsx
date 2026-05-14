"use client";

import "./magazzino-scroll.css";

import type { ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagazzinoGiacenzaBell } from "@/components/gestionale/magazzino/magazzino-giacenza-bell";
import { MagazzinoPrezziLineari } from "@/components/gestionale/magazzino/magazzino-prezzi-lineari";
import { RicambioFormFields } from "@/components/gestionale/magazzino/ricambio-form-fields";
import { MOCK_RICAMBI } from "@/lib/mock-data/magazzino";
import { getMagazzinoReportSnapshot, setMagazzinoReportSnapshot } from "@/lib/magazzino/magazzino-report-sync";
import { MAGAZZINO_PRODOTTI_REFRESH_EVENT } from "@/lib/magazzino/magazzino-prodotti-refresh-event";
import { CAB_MAGAZZINO_MASTER_REFRESH, CAB_MEZZI_LISTE_REFRESH } from "@/lib/sistema/cab-events";
import { flattenCompatDaAttrezzature, migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { getMezziListePrefsOrDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import {
  loadMagazzinoMasterPrefs,
  saveMagazzinoMasterPrefs,
} from "@/lib/magazzino/magazzino-master-prefs-storage";
import {
  loadMagazzinoChangeLog,
  saveMagazzinoChangeLog,
  type MagazzinoChangeLogEntry,
} from "@/lib/magazzino/magazzino-change-log-storage";
import {
  emptyRicambioForm,
  formatMarkupDisplay,
  ricambioFormImportantWarnings,
  ricambioFromForm,
  ricambioFromFormLenient,
  toFormDraft,
  type RicambioFormState,
} from "@/lib/magazzino/form";
import {
  analyzeArchiveDuplicateCodes,
  findFirstDuplicateByCodiceOriginale,
  type MagazzinoArchiveDuplicateCodeGroup,
} from "@/lib/magazzino/duplicates";
import { compareByColumn, compareNaturalOrder, type SortPhaseMagazzino } from "@/lib/magazzino/sort-order";
import {
  buildConsumoMapMagazzinoRolling36ForProducts,
  formatAutonomiaMesi,
  formatAvgMonthlyMagazzinoIt,
  formatMonthKeyIt,
} from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino, SortKeyMagazzino } from "@/lib/magazzino/types";
import { dsPageToolbarBtn, dsStackPage, dsScrollbar, dsTable, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { MobileFilterDrawer } from "@/components/gestionale/mobile-filter-drawer";
import { gestionaleSelectFilterClass, erpBtnNuovaLavorazione } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  buildMagazzinoGestionaleLogViewModel,
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  IconGestionaleLog,
  gestionaleLogPanelAsideClass,
  gestionaleLogPanelHeaderClass,
  gestionaleLogScrollClass,
  gestionaleLogScrollEmbeddedClass,
  logEntryDismissBtnClass,
} from "@/components/gestionale/gestionale-log-ui";
import { useAuth } from "@/context/auth-context";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { Q_FOCUS_RICAMBIO } from "@/lib/navigation/dashboard-log-links";

function eur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function initialMasterFromProducts(rows: RicambioMagazzino[]) {
  const marche = new Set<string>();
  const categorie = new Set<string>();
  const mezzi = new Set<string>();
  for (const r of rows) {
    marche.add(r.marca);
    categorie.add(r.categoria);
    r.compatibilitaMezzi.forEach((m) => mezzi.add(m));
  }
  return {
    marche: [...marche].sort((a, b) => a.localeCompare(b, "it")),
    categorie: [...categorie].sort((a, b) => a.localeCompare(b, "it")),
    mezzi: [...mezzi].sort((a, b) => a.localeCompare(b, "it")),
  };
}

function initialFornitoriFromProducts(rows: RicambioMagazzino[]) {
  const s = new Set<string>();
  for (const r of rows) {
    const t = r.fornitoreNonOriginale.trim();
    if (t) s.add(t);
  }
  return [...s].sort((a, b) => a.localeCompare(b, "it"));
}

function mergeMasterWithRows(master: string[], rowValues: string[]) {
  const s = new Set([...master, ...rowValues]);
  return [...s].sort((a, b) => a.localeCompare(b, "it"));
}

function compatLabel(list: string[]) {
  return list.join(", ");
}

function rowStockBg(r: RicambioMagazzino) {
  if (r.scorta < r.scortaMinima) {
    return "bg-red-50/50 dark:bg-red-950/20";
  }
  if (r.scorta === r.scortaMinima) {
    return "bg-orange-50/40 dark:bg-orange-950/15";
  }
  return "";
}

function rowStockBorderFirstTd(r: RicambioMagazzino) {
  if (r.scorta < r.scortaMinima) {
    return "border-l-4 border-l-red-500";
  }
  if (r.scorta === r.scortaMinima) {
    return "border-l-4 border-l-orange-500";
  }
  return "";
}

function consumoCellTone(avg: number | null, sortedVals: number[]): string {
  if (avg == null || !Number.isFinite(avg)) return "text-zinc-600 dark:text-zinc-400";
  if (sortedVals.length < 3) return "text-zinc-800 dark:text-zinc-200";
  const i33 = Math.min(sortedVals.length - 1, Math.floor(sortedVals.length * 0.33));
  const i66 = Math.min(sortedVals.length - 1, Math.floor(sortedVals.length * 0.66));
  const p33 = sortedVals[i33] ?? sortedVals[0]!;
  const p66 = sortedVals[i66] ?? sortedVals[sortedVals.length - 1]!;
  if (avg >= p66) return "font-semibold text-orange-900 dark:text-orange-100";
  if (avg <= p33) return "text-zinc-500 dark:text-zinc-400";
  return "text-zinc-800 dark:text-zinc-200";
}

function formatTimestampHover(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDataUltimaMain(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isModificaOlderThanMonths(iso: string, months: number) {
  const t = new Date(iso).getTime();
  const limit = new Date();
  limit.setMonth(limit.getMonth() - months);
  return t < limit.getTime();
}

const CAMPO_LABEL: Partial<Record<keyof RicambioMagazzino, string>> = {
  marca: "Marca",
  codiceFornitoreOriginale: "Codice",
  descrizione: "Descrizione",
  note: "Note",
  categoria: "Categoria",
  compatibilitaMezzi: "Compatibilità",
  scorta: "Scorta",
  scortaMinima: "Scorta minima",
  prezzoFornitoreOriginale: "Prezzo listino OE",
  scontoFornitoreOriginale: "Sconto OE %",
  markupPercentuale: "Markup %",
  prezzoVendita: "Prezzo vendita",
  fornitoreNonOriginale: "Fornitore alternativo",
  codiceFornitoreNonOriginale: "Codice alternativo",
  prezzoFornitoreNonOriginale: "Prezzo alternativo",
  scontoFornitoreNonOriginale: "Sconto alt. %",
};

const DIFF_KEYS: (keyof RicambioMagazzino)[] = [
  "marca",
  "codiceFornitoreOriginale",
  "descrizione",
  "note",
  "categoria",
  "compatibilitaMezzi",
  "scorta",
  "scortaMinima",
  "prezzoFornitoreOriginale",
  "scontoFornitoreOriginale",
  "markupPercentuale",
  "prezzoVendita",
  "fornitoreNonOriginale",
  "codiceFornitoreNonOriginale",
  "prezzoFornitoreNonOriginale",
  "scontoFornitoreNonOriginale",
];

type CampoChange = { campo: string; prima: string; dopo: string };

function fmtForDiff(k: keyof RicambioMagazzino, r: RicambioMagazzino): string {
  const v = r[k];
  if (Array.isArray(v)) return (v as string[]).join(", ") || "—";
  if (typeof v === "number") {
    if (k === "markupPercentuale") {
      return formatMarkupDisplay(v);
    }
    if (k === "scontoFornitoreOriginale" || k === "scontoFornitoreNonOriginale") {
      return `${v}%`;
    }
    if (
      k === "prezzoFornitoreOriginale" ||
      k === "prezzoFornitoreNonOriginale" ||
      k === "prezzoVendita"
    ) {
      return eur(v);
    }
    return String(v);
  }
  const s = String(v ?? "").trim();
  return s || "—";
}

function diffRicambi(before: RicambioMagazzino, after: RicambioMagazzino): CampoChange[] {
  const out: CampoChange[] = [];
  for (const key of DIFF_KEYS) {
    const b = fmtForDiff(key, before);
    const a = fmtForDiff(key, after);
    if (b !== a) {
      out.push({ campo: CAMPO_LABEL[key] ?? String(key), prima: b, dopo: a });
    }
  }
  return out;
}

function changesForNuovoRicambio(r: RicambioMagazzino): CampoChange[] {
  return DIFF_KEYS.map((key) => ({
    campo: CAMPO_LABEL[key] ?? String(key),
    prima: "—",
    dopo: fmtForDiff(key, r),
  })).filter((c) => c.dopo !== "—");
}

type MagazzinoLogTipo = "aggiunta" | "update" | "rimozione";

type MagazzinoLogEntry = MagazzinoChangeLogEntry;

function computeRiepilogo(changes: CampoChange[]): string {
  const parts: string[] = [];
  for (const c of changes) {
    if (c.campo === "Scorta") {
      const p = Number.parseInt(c.prima, 10);
      const d = Number.parseInt(c.dopo, 10);
      if (!Number.isNaN(p) && !Number.isNaN(d)) {
        const delta = d - p;
        parts.push(delta >= 0 ? `Scorta +${delta}` : `Scorta ${delta}`);
      } else {
        parts.push("Scorta aggiornata");
      }
    } else if (c.campo === "Prezzo vendita") {
      parts.push("Prezzo vendita aggiornato");
    } else if (c.campo === "Descrizione") {
      parts.push("Descrizione modificata");
    } else {
      parts.push(`${c.campo} aggiornato`);
    }
  }
  return [...new Set(parts)].join(", ");
}

/** Stile interazioni ERP uniforme (hover / active / ring) */
const erpFocus =
  "outline-none transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-orange-400/45 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-zinc-900";
const erpBtnNeutral = `inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 hover:shadow-md hover:ring-1 hover:ring-zinc-200/75 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:ring-zinc-600/45 ${erpFocus}`;
const erpBtnAccent = `inline-flex items-center justify-center gap-2 rounded-lg border border-orange-400/70 bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 hover:shadow-md hover:ring-2 hover:ring-orange-400/35 dark:border-orange-500/55 ${erpFocus}`;
const erpBtnSoftOrange = `inline-flex items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-900 shadow-sm hover:bg-orange-100 hover:shadow-md hover:ring-1 hover:ring-orange-200/75 dark:border-orange-900/45 dark:bg-orange-950/45 dark:text-orange-100 dark:hover:bg-orange-950/65 dark:hover:ring-orange-800/40 ${erpFocus}`;
const erpBtnIcon = `inline-flex min-w-[2rem] items-center justify-center rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 hover:shadow-md hover:ring-1 hover:ring-zinc-200/75 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${erpFocus}`;
const erpBtnSubtleNew = `inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300/90 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-100 hover:shadow-md hover:ring-1 hover:ring-zinc-300/60 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-800 ${erpFocus}`;

/** Select filtri: spazio per icona a sinistra + chevron a destra (stile unificato gestionale). */
function MagazzinoFilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (next: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full min-w-[11rem] max-w-full flex-1 sm:max-w-[18rem]">
      <span
        className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-orange-600 dark:text-orange-400"
        aria-hidden
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={gestionaleSelectFilterClass}>
        {children}
      </select>
    </div>
  );
}

function SortTh({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
  headerClassName = "",
  buttonClassName = "",
}: {
  label: string;
  columnKey: SortKeyMagazzino;
  sortColumn: SortKeyMagazzino | null;
  sortPhase: SortPhaseMagazzino;
  onSort: (k: SortKeyMagazzino) => void;
  headerClassName?: string;
  buttonClassName?: string;
}) {
  const active = sortColumn === columnKey && (sortPhase === "asc" || sortPhase === "desc");
  let icon: ReactNode = <span className="opacity-40">↕</span>;
  if (active) {
    icon = sortPhase === "asc" ? <span>↑</span> : <span>↓</span>;
  }
  return (
    <th className={`px-3 py-2 align-middle ${headerClassName}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${buttonClassName} ${
          active ? "text-orange-600 dark:text-orange-400" : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {label}
        {icon}
      </button>
    </th>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[128px_1fr] gap-2 border-b border-zinc-100 py-2 text-sm last:border-b-0 dark:border-zinc-800">
      <div className="font-medium text-zinc-500">{label}</div>
      <div className="text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function ArchiveDupRicambioRow({
  p,
  onOpen,
}: {
  p: RicambioMagazzino;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p.id)}
      className="w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-2 text-left text-xs transition-colors hover:border-orange-300/60 hover:bg-orange-50/40 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-orange-800/50 dark:hover:bg-orange-950/25"
    >
      <div className="font-semibold text-zinc-800 dark:text-zinc-100">{p.marca}</div>
      <div className="mt-0.5 font-mono text-[11px] font-medium text-zinc-700 dark:text-zinc-200">{p.codiceFornitoreOriginale}</div>
      <div className="mt-0.5 min-w-0 text-[11px] leading-snug text-zinc-600 dark:text-zinc-300">{p.descrizione}</div>
      <div className="mt-1 font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">Scorta {p.scorta}</div>
    </button>
  );
}

export function MagazzinoView() {
  const { authorName } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orderMapRef = useRef<Map<string, number> | null>(null);
  const nextOrderRef = useRef<number | null>(null);
  if (orderMapRef.current === null) {
    orderMapRef.current = new Map(MOCK_RICAMBI.map((r, i) => [r.id, i]));
    nextOrderRef.current = MOCK_RICAMBI.length;
  }

  function registerOrderIndex(id: string) {
    const m = orderMapRef.current!;
    if (!m.has(id)) {
      m.set(id, nextOrderRef.current!);
      nextOrderRef.current! += 1;
    }
  }

  const [prodotti, setProdotti] = useState<RicambioMagazzino[]>(MOCK_RICAMBI);
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<SortKeyMagazzino | null>(null);
  const [sortPhase, setSortPhase] = useState<SortPhaseMagazzino>("natural");
  const [filtroMarca, setFiltroMarca] = useState<string>("__tutti__");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("__tutti__");
  const [filtroCompat, setFiltroCompat] = useState<string>("__tutti__");
  const [soloSottoScorta, setSoloSottoScorta] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const [masterMarche, setMasterMarche] = useState<string[]>(() => initialMasterFromProducts(MOCK_RICAMBI).marche);
  const [masterCategorie, setMasterCategorie] = useState<string[]>(() => initialMasterFromProducts(MOCK_RICAMBI).categorie);
  const [masterMezzi, setMasterMezzi] = useState<string[]>(() => initialMasterFromProducts(MOCK_RICAMBI).mezzi);
  const [masterFornitori, setMasterFornitori] = useState<string[]>(() => initialFornitoriFromProducts(MOCK_RICAMBI));
  const [nuovaMarca, setNuovaMarca] = useState("");
  const [nuovaCategoria, setNuovaCategoria] = useState("");
  const [nuovoFornitore, setNuovoFornitore] = useState("");
  const [masterPrefsHydrated, setMasterPrefsHydrated] = useState(false);
  const [mezziListeTick, setMezziListeTick] = useState(0);
  const mezziListePrefs = useMemo(() => migrateMezziListePrefs(getMezziListePrefsOrDefault()), [mezziListeTick]);

  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState<RicambioFormState>(emptyRicambioForm());
  const [dupCheckModalOpen, setDupCheckModalOpen] = useState(false);
  const [newIncompleteOpen, setNewIncompleteOpen] = useState(false);
  const [newIncompleteList, setNewIncompleteList] = useState<string[]>([]);

  const [detail, setDetail] = useState<{ id: string; mode: "info" | "edit" } | null>(null);
  const [editDraft, setEditDraft] = useState<RicambioFormState | null>(null);

  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const flashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logSeqRef = useRef(0);
  const LOG_DEBOUNCE_MS = 650;
  const pendingLogRef = useRef<{
    ricambioId: string;
    ricambioLabel: string;
    autore: string;
    changes: Map<string, { prima: string; dopo: string }>;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const [logEntries, setLogEntries] = useState<MagazzinoLogEntry[]>([]);
  const [logPersistReady, setLogPersistReady] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const listPageSize = useResponsiveListPageSize();
  const {
    page: magLogPage,
    setPage: setMagLogPage,
    pageCount: magLogPageCount,
    sliceItems: sliceMagLogEntries,
    showPager: showMagLogPager,
    label: magLogPagerLabel,
    resetPage: resetMagLogPage,
  } = useClientPagination(logEntries.length, listPageSize);

  useEffect(() => {
    resetMagLogPage();
  }, [logOpen, logEntries.length, listPageSize, resetMagLogPage]);

  const pagedMagLogEntries = useMemo(() => sliceMagLogEntries(logEntries), [logEntries, sliceMagLogEntries, magLogPage]);

  const [timelineByRicambio, setTimelineByRicambio] = useState<Record<string, MagazzinoLogEntry[]>>(() => {
    const o: Record<string, MagazzinoLogEntry[]> = {};
    for (const p of MOCK_RICAMBI) {
      o[p.id] = [
        {
          id: `seed-${p.id}`,
          tipo: "update",
          ricambioId: p.id,
          ricambio: p.descrizione,
          autore: p.autoreUltimaModifica,
          at: p.dataUltimaModifica,
          changes: [
            {
              campo: "Sincronizzazione",
              prima: "—",
              dopo: "Record da anagrafica (dato iniziale)",
            },
          ],
          riepilogo: "Dato anagrafica iniziale",
        },
      ];
    }
    return o;
  });

  const setEditForm = useCallback<Dispatch<SetStateAction<RicambioFormState>>>((action) => {
    setEditDraft((prev) => {
      if (prev === null) return null;
      return typeof action === "function" ? action(prev) : action;
    });
  }, []);

  function mergeIntoPending(map: Map<string, { prima: string; dopo: string }>, ch: CampoChange) {
    const ex = map.get(ch.campo);
    if (ex) map.set(ch.campo, { prima: ex.prima, dopo: ch.dopo });
    else map.set(ch.campo, { prima: ch.prima, dopo: ch.dopo });
  }

  function applyLogEntry(entry: MagazzinoLogEntry) {
    setLogEntries((prev) => [entry, ...prev].slice(0, 100));
    setTimelineByRicambio((prev) => ({
      ...prev,
      [entry.ricambioId]: [entry, ...(prev[entry.ricambioId] ?? [])].slice(0, 80),
    }));
  }

  function removeMagazzinoLogEntry(id: string) {
    setLogEntries((prev) => prev.filter((e) => e.id !== id));
    setTimelineByRicambio((prev) => {
      const next: Record<string, MagazzinoLogEntry[]> = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = (next[k] ?? []).filter((e) => e.id !== id);
      }
      return next;
    });
  }

  function flushPendingLog() {
    const p = pendingLogRef.current;
    if (!p) return;
    if (p.timer) clearTimeout(p.timer);
    p.timer = null;
    pendingLogRef.current = null;
    const changes: CampoChange[] = Array.from(p.changes.entries()).map(([campo, v]) => ({
      campo,
      prima: v.prima,
      dopo: v.dopo,
    }));
    if (changes.length === 0) return;
    const base = computeRiepilogo(changes);
    const riepilogo = `${p.autore} — ${base}`;
    const entry: MagazzinoLogEntry = {
      id: `log-${Date.now()}-${++logSeqRef.current}`,
      tipo: "update",
      ricambioId: p.ricambioId,
      ricambio: p.ricambioLabel,
      autore: p.autore,
      at: new Date().toISOString(),
      changes,
      riepilogo,
    };
    applyLogEntry(entry);
  }

  function queueFieldUpdates(ricambioId: string, ricambioLabel: string, incoming: CampoChange[], autore: string) {
    const cur = pendingLogRef.current;
    if (cur && cur.ricambioId !== ricambioId) flushPendingLog();
    let p = pendingLogRef.current;
    if (!p || p.ricambioId !== ricambioId) {
      p = {
        ricambioId,
        ricambioLabel,
        autore,
        changes: new Map(),
        timer: null,
      };
      pendingLogRef.current = p;
    }
    for (const ch of incoming) mergeIntoPending(p.changes, ch);
    if (p.timer) clearTimeout(p.timer);
    p.timer = setTimeout(flushPendingLog, LOG_DEBOUNCE_MS);
  }

  function logImmediate(
    ricambioId: string,
    ricambioLabel: string,
    tipo: MagazzinoLogTipo,
    changes: CampoChange[],
    autore: string = authorName,
  ) {
    flushPendingLog();
    const riepilogo =
      tipo === "aggiunta"
        ? "Nuovo ricambio registrato"
        : tipo === "rimozione"
          ? "Rimosso dal magazzino"
          : `${autore} — ${computeRiepilogo(changes)}`;
    const entry: MagazzinoLogEntry = {
      id: `log-${Date.now()}-${++logSeqRef.current}`,
      tipo,
      ricambioId,
      ricambio: ricambioLabel,
      autore,
      at: new Date().toISOString(),
      changes,
      riepilogo,
    };
    applyLogEntry(entry);
  }

  const flashRow = useCallback((id: string) => {
    if (flashClearRef.current) clearTimeout(flashClearRef.current);
    setFlashRowId(id);
    flashClearRef.current = setTimeout(() => {
      setFlashRowId(null);
      flashClearRef.current = null;
    }, 820);
  }, []);

  const focusRicambioInTable = useCallback(
    (ricambioId: string, opts?: { applySottoScorta?: boolean }) => {
      setDupCheckModalOpen(false);
      setNewOpen(false);
      setFiltroMarca("__tutti__");
      setFiltroCategoria("__tutti__");
      setFiltroCompat("__tutti__");
      setSoloSottoScorta(Boolean(opts?.applySottoScorta));
      setSearch("");
      setLogOpen(false);
      flashRow(ricambioId);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById(`magazzino-row-${ricambioId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
          });
        });
      });
    },
    [flashRow],
  );

  useEffect(() => {
    const id = searchParams.get(Q_FOCUS_RICAMBIO);
    if (!id) return;
    const t = window.setTimeout(() => {
      focusRicambioInTable(id);
      router.replace(pathname, { scroll: false });
    }, 120);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router, focusRicambioInTable]);

  useEffect(() => {
    return () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current);
      const pend = pendingLogRef.current;
      if (pend?.timer) clearTimeout(pend.timer);
      pendingLogRef.current = null;
    };
  }, []);

  useEffect(() => {
    setMagazzinoReportSnapshot(prodotti);
  }, [prodotti]);

  useEffect(() => {
    const rows = getMagazzinoReportSnapshot();
    const src = rows.length ? rows : MOCK_RICAMBI;
    const fromP = initialMasterFromProducts(src);
    const fromF = initialFornitoriFromProducts(src);
    const fromListe = flattenCompatDaAttrezzature(getMezziListePrefsOrDefault());
    const stored = loadMagazzinoMasterPrefs();
    if (stored) {
      setMasterMarche(mergeMasterWithRows(stored.marche, fromP.marche));
      setMasterCategorie(mergeMasterWithRows(stored.categorie, fromP.categorie));
      setMasterMezzi(mergeMasterWithRows(mergeMasterWithRows(stored.mezziCompatibili, fromP.mezzi), fromListe));
      setMasterFornitori(mergeMasterWithRows(stored.fornitori ?? [], fromF));
    } else {
      setMasterMarche(fromP.marche);
      setMasterCategorie(fromP.categorie);
      setMasterMezzi(mergeMasterWithRows(fromP.mezzi, fromListe));
      setMasterFornitori(fromF);
    }
    setMasterPrefsHydrated(true);
  }, []);

  useEffect(() => {
    if (!masterPrefsHydrated) return;
    saveMagazzinoMasterPrefs({
      marche: masterMarche,
      categorie: masterCategorie,
      mezziCompatibili: masterMezzi,
      fornitori: masterFornitori,
    });
  }, [masterMarche, masterCategorie, masterMezzi, masterFornitori, masterPrefsHydrated]);

  useEffect(() => {
    if (pathname !== "/magazzino") return;
    const stored = loadMagazzinoMasterPrefs();
    if (!stored) return;
    const rows = getMagazzinoReportSnapshot();
    const src = rows.length ? rows : MOCK_RICAMBI;
    const fromP = initialMasterFromProducts(src);
    const fromF = initialFornitoriFromProducts(src);
    const fromListe = flattenCompatDaAttrezzature(getMezziListePrefsOrDefault());
    setMasterMarche((prev) => {
      const next = mergeMasterWithRows(stored.marche, fromP.marche);
      return prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next;
    });
    setMasterCategorie((prev) => {
      const next = mergeMasterWithRows(stored.categorie, fromP.categorie);
      return prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next;
    });
    setMasterMezzi((prev) => {
      const next = mergeMasterWithRows(mergeMasterWithRows(stored.mezziCompatibili, fromP.mezzi), fromListe);
      return prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next;
    });
    setMasterFornitori((prev) => {
      const next = mergeMasterWithRows(stored.fornitori ?? [], fromF);
      return prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next;
    });
  }, [pathname]);

  useEffect(() => {
    function onExt() {
      const stored = loadMagazzinoMasterPrefs();
      if (!stored) return;
      const rows = getMagazzinoReportSnapshot();
      const src = rows.length ? rows : MOCK_RICAMBI;
      const fromP = initialMasterFromProducts(src);
      const fromF = initialFornitoriFromProducts(src);
      const fromListe = flattenCompatDaAttrezzature(getMezziListePrefsOrDefault());
      setMasterMarche(mergeMasterWithRows(stored.marche, fromP.marche));
      setMasterCategorie(mergeMasterWithRows(stored.categorie, fromP.categorie));
      setMasterMezzi(mergeMasterWithRows(mergeMasterWithRows(stored.mezziCompatibili, fromP.mezzi), fromListe));
      setMasterFornitori(mergeMasterWithRows(stored.fornitori ?? [], fromF));
    }
    window.addEventListener(CAB_MAGAZZINO_MASTER_REFRESH, onExt);
    return () => window.removeEventListener(CAB_MAGAZZINO_MASTER_REFRESH, onExt);
  }, []);

  useEffect(() => {
    function onListe() {
      setMezziListeTick((t) => t + 1);
      const stored = loadMagazzinoMasterPrefs();
      const rows = getMagazzinoReportSnapshot();
      const src = rows.length ? rows : MOCK_RICAMBI;
      const fromP = initialMasterFromProducts(src);
      const fromListe = flattenCompatDaAttrezzature(getMezziListePrefsOrDefault());
      if (stored) {
        setMasterMezzi(mergeMasterWithRows(mergeMasterWithRows(stored.mezziCompatibili, fromP.mezzi), fromListe));
      } else {
        setMasterMezzi(mergeMasterWithRows(fromP.mezzi, fromListe));
      }
    }
    window.addEventListener(CAB_MEZZI_LISTE_REFRESH, onListe);
    return () => window.removeEventListener(CAB_MEZZI_LISTE_REFRESH, onListe);
  }, []);

  useEffect(() => {
    setLogEntries(loadMagazzinoChangeLog());
    setLogPersistReady(true);
  }, []);

  useEffect(() => {
    if (!logPersistReady) return;
    saveMagazzinoChangeLog(logEntries);
  }, [logEntries, logPersistReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromSnapshot = () => {
      setProdotti(() => getMagazzinoReportSnapshot().map((r) => ({ ...r })));
      setLogEntries(loadMagazzinoChangeLog());
    };
    window.addEventListener(MAGAZZINO_PRODOTTI_REFRESH_EVENT, syncFromSnapshot);
    return () => window.removeEventListener(MAGAZZINO_PRODOTTI_REFRESH_EVENT, syncFromSnapshot);
  }, []);

  const marche = useMemo(
    () => mergeMasterWithRows(masterMarche, prodotti.map((p) => p.marca)),
    [masterMarche, prodotti],
  );

  const categorie = useMemo(
    () => mergeMasterWithRows(masterCategorie, prodotti.map((p) => p.categoria)),
    [masterCategorie, prodotti],
  );

  const mezzi = useMemo(() => {
    const fromRows: string[] = [];
    prodotti.forEach((p) => p.compatibilitaMezzi.forEach((m) => fromRows.push(m)));
    return mergeMasterWithRows(masterMezzi, fromRows);
  }, [masterMezzi, prodotti]);

  const sottoScortaTotale = useMemo(
    () => prodotti.filter((p) => p.scorta < p.scortaMinima).length,
    [prodotti],
  );

  const sottoScortaList = useMemo(
    () => prodotti.filter((p) => p.scorta < p.scortaMinima),
    [prodotti],
  );

  const archivioDupCodeGroups = useMemo(() => analyzeArchiveDuplicateCodes(prodotti), [prodotti]);
  const archivioDupCodeCount = archivioDupCodeGroups.length;

  const nuovoCodiceDupEsistente = useMemo(() => {
    if (!newOpen) return null;
    return findFirstDuplicateByCodiceOriginale(prodotti, newForm.codiceFornitoreOriginale);
  }, [newOpen, prodotti, newForm.codiceFornitoreOriginale]);

  const nuovoCodiceBloccaSalvataggio = Boolean(nuovoCodiceDupEsistente);

  const consumoMap = useMemo(
    () => buildConsumoMapMagazzinoRolling36ForProducts(logEntries, prodotti, new Date()),
    [logEntries, prodotti],
  );

  const consumoAvgById = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const p of prodotti) {
      const c = consumoMap.get(p.id);
      m.set(p.id, c?.avgMonthly ?? null);
    }
    return m;
  }, [prodotti, consumoMap]);

  const consumoAvgSortedAll = useMemo(() => {
    const s: number[] = [];
    for (const p of prodotti) {
      const v = consumoMap.get(p.id)?.avgMonthly;
      if (v != null && Number.isFinite(v)) s.push(v);
    }
    s.sort((a, b) => a - b);
    return s;
  }, [prodotti, consumoMap]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const orderMap = orderMapRef.current!;
    let rows = prodotti.filter((p) => {
      if (filtroMarca !== "__tutti__" && p.marca !== filtroMarca) return false;
      if (filtroCategoria !== "__tutti__" && p.categoria !== filtroCategoria) return false;
      if (filtroCompat !== "__tutti__" && !p.compatibilitaMezzi.includes(filtroCompat)) return false;
      if (soloSottoScorta && !(p.scorta < p.scortaMinima)) return false;
      if (!q) return true;
      const hay = [
        p.marca,
        p.codiceFornitoreOriginale,
        p.codiceFornitoreNonOriginale,
        p.descrizione,
        p.note,
        p.categoria,
        p.fornitoreNonOriginale,
        ...p.compatibilitaMezzi,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    rows = [...rows].sort((a, b) => {
      if (sortPhase === "natural" || sortColumn === null) {
        return compareNaturalOrder(a, b, orderMap);
      }
      const primary = compareByColumn(a, b, sortColumn, sortPhase, consumoAvgById);
      if (primary !== 0) return primary;
      return compareNaturalOrder(a, b, orderMap);
    });

    return rows;
  }, [
    prodotti,
    search,
    filtroMarca,
    filtroCategoria,
    filtroCompat,
    soloSottoScorta,
    sortColumn,
    sortPhase,
    consumoAvgById,
  ]);

  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(filteredSorted.length, listPageSize);

  useEffect(() => {
    resetPage();
  }, [search, filtroMarca, filtroCategoria, filtroCompat, soloSottoScorta, sortColumn, sortPhase, listPageSize, resetPage]);

  const pagedMagazzino = useMemo(() => sliceItems(filteredSorted), [sliceItems, filteredSorted, page]);

  function onSort(k: SortKeyMagazzino) {
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

  function touch(p: RicambioMagazzino): RicambioMagazzino {
    return {
      ...p,
      dataUltimaModifica: new Date().toISOString(),
      autoreUltimaModifica: authorName,
    };
  }

  function adjustScorta(id: string, delta: number) {
    const row = prodotti.find((p) => p.id === id);
    if (!row) return;
    const dopo = Math.max(0, Math.round(row.scorta + delta));
    queueFieldUpdates(
      id,
      row.descrizione,
      [{ campo: "Scorta", prima: String(row.scorta), dopo: String(dopo) }],
      authorName,
    );
    setProdotti((prev) =>
      prev.map((p) =>
        p.id === id ? touch({ ...p, scorta: Math.max(0, Math.round(p.scorta + delta)) }) : p,
      ),
    );
    flashRow(id);
  }

  function openNewModal() {
    setNewForm(emptyRicambioForm());
    setNewOpen(true);
  }

  function finalizeNewRicambio() {
    const r = ricambioFromFormLenient(newForm, undefined, authorName);
    if (findFirstDuplicateByCodiceOriginale(prodotti, newForm.codiceFornitoreOriginale)) {
      return;
    }
    registerOrderIndex(r.id);
    setProdotti((prev) => [r, ...prev]);
    setNewForm(emptyRicambioForm());
    setNewOpen(false);
    setNewIncompleteOpen(false);
    setNewIncompleteList([]);
    logImmediate(r.id, r.descrizione, "aggiunta", changesForNuovoRicambio(r), authorName);
    flashRow(r.id);
  }

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (nuovoCodiceBloccaSalvataggio) return;
    const warnings = ricambioFormImportantWarnings(newForm);
    if (warnings.length) {
      setNewIncompleteList(warnings);
      setNewIncompleteOpen(true);
      return;
    }
    finalizeNewRicambio();
  }

  const detailRicambio = detail ? prodotti.find((p) => p.id === detail.id) : undefined;

  function openInfo(p: RicambioMagazzino) {
    setDetail({ id: p.id, mode: "info" });
    setEditDraft(null);
  }

  function startEditFromInfo() {
    if (!detailRicambio) return;
    setEditDraft(toFormDraft(detailRicambio));
    setDetail({ id: detailRicambio.id, mode: "edit" });
  }

  function cancelEditBackToInfo() {
    if (!detail) return;
    setEditDraft(null);
    setDetail({ id: detail.id, mode: "info" });
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!detail || detail.mode !== "edit" || !editDraft) return;
    const before = prodotti.find((p) => p.id === detail.id);
    const next = ricambioFromForm(editDraft, detail.id, authorName);
    if (!next || !before) return;
    const changes = diffRicambi(before, next);
    setProdotti((prev) => prev.map((p) => (p.id === detail.id ? touch(next) : p)));
    setEditDraft(null);
    setDetail({ id: detail.id, mode: "info" });
    if (changes.length > 0) {
      logImmediate(detail.id, next.descrizione, "update", changes, authorName);
    }
    flashRow(detail.id);
  }

  function eliminaRicambio() {
    if (!detailRicambio) return;
    if (!window.confirm(`Eliminare il ricambio "${detailRicambio.descrizione}" dal magazzino?`)) return;
    logImmediate(detailRicambio.id, detailRicambio.descrizione, "rimozione", [], authorName);
    setProdotti((prev) => prev.filter((p) => p.id !== detailRicambio.id));
    setDetail(null);
    setEditDraft(null);
  }

  function closeDetail() {
    setDetail(null);
    setEditDraft(null);
  }

  const infoTimeline = useMemo(() => {
    if (!detailRicambio) return [];
    return [...(timelineByRicambio[detailRicambio.id] ?? [])].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [detailRicambio, timelineByRicambio]);

  const anyOverlayOpen = newOpen || newIncompleteOpen || !!detail || logOpen || dupCheckModalOpen;
  useEffect(() => {
    if (!anyOverlayOpen) return;
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
  }, [anyOverlayOpen]);

  function addMasterMarca() {
    const t = nuovaMarca.trim();
    if (!t) return;
    setMasterMarche((prev) => [...new Set([...prev, t])].sort((a, b) => a.localeCompare(b, "it")));
    setNuovaMarca("");
  }
  function removeMasterMarca(m: string) {
    const n = prodotti.filter((p) => p.marca === m).length;
    if (n > 0 && !window.confirm(`Marca usata da ${n} ricambi. Rimuoverla dall'anagrafica?`)) return;
    setMasterMarche((prev) => prev.filter((x) => x !== m));
  }
  function addMasterCategoria() {
    const t = nuovaCategoria.trim();
    if (!t) return;
    setMasterCategorie((prev) => [...new Set([...prev, t])].sort((a, b) => a.localeCompare(b, "it")));
    setNuovaCategoria("");
  }
  function removeMasterCategoria(c: string) {
    const n = prodotti.filter((p) => p.categoria === c).length;
    if (n > 0 && !window.confirm(`Categoria usata da ${n} ricambi. Rimuoverla dall'anagrafica?`)) return;
    setMasterCategorie((prev) => prev.filter((x) => x !== c));
  }
  function removeMasterMezzo(m: string) {
    const n = prodotti.reduce((acc, p) => acc + (p.compatibilitaMezzi.includes(m) ? 1 : 0), 0);
    if (n > 0 && !window.confirm(`Mezzo indicato su ${n} ricambi. Rimuoverlo dall'anagrafica?`)) return;
    setMasterMezzi((prev) => prev.filter((x) => x !== m));
  }
  function addMasterFornitore() {
    const t = nuovoFornitore.trim();
    if (!t) return;
    setMasterFornitori((prev) => [...new Set([...prev, t])].sort((a, b) => a.localeCompare(b, "it")));
    setNuovoFornitore("");
  }
  function removeMasterFornitore(f: string) {
    const n = prodotti.filter((p) => p.fornitoreNonOriginale.trim() === f).length;
    if (n > 0 && !window.confirm(`Fornitore indicato su ${n} ricambi. Rimuoverlo dall'anagrafica?`)) return;
    setMasterFornitori((prev) => prev.filter((x) => x !== f));
  }

  function resetMagazzinoFilters() {
    setSearch("");
    setFiltroMarca("__tutti__");
    setFiltroCategoria("__tutti__");
    setFiltroCompat("__tutti__");
    setSoloSottoScorta(false);
  }

  return (
    <div className="magazzino-scroll-scope">
      <PageHeader
        title="Magazzino ricambi"
        actions={
          <div className="flex flex-nowrap items-center justify-end gap-2 overflow-x-auto">
            <MagazzinoGiacenzaBell
              count={sottoScortaTotale}
              items={sottoScortaList}
              onSelectRicambio={(id) => focusRicambioInTable(id, { applySottoScorta: true })}
              triggerClassName={`${dsPageToolbarBtn} shrink-0`}
            />
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
              title="Storico modifiche"
            >
              <IconGestionaleLog />
              <span className="sr-only">Log modifiche</span>
            </button>
          </div>
        }
      />

      <div className={dsStackPage}>
      <ShellCard title="Elenco ricambi">
        {archivioDupCodeCount > 0 ? (
          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/45 dark:bg-amber-950/25">
            <p className="text-amber-950 dark:text-amber-100">
              {archivioDupCodeCount === 1 ? (
                <>
                  Rilevato <span className="font-semibold tabular-nums">1</span> codice duplicato in archivio
                </>
              ) : (
                <>
                  Rilevati <span className="font-semibold tabular-nums">{archivioDupCodeCount}</span> codici duplicati in
                  archivio
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setDupCheckModalOpen(true)}
              className={`${erpBtnSoftOrange} shrink-0 self-start sm:self-auto`}
            >
              Mostra
            </button>
          </div>
        ) : null}

        <div className="mb-4 flex flex-col gap-3 md:hidden">
          <div className="flex flex-wrap items-stretch gap-2">
            <button
              type="button"
              onClick={() => setFiltersDrawerOpen(true)}
              className={`${dsPageToolbarBtn} min-h-11 flex-1 justify-center`}
            >
              Filtri
            </button>
            <button
              type="button"
              onClick={openNewModal}
              className={`${erpBtnNuovaLavorazione} min-h-11 flex-1 justify-center`}
              title="Aggiungi un ricambio"
            >
              <span className="text-base font-semibold leading-none" aria-hidden>
                +
              </span>
              Nuovo
            </button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">{filteredSorted.length}</span> risultati
          </p>
        </div>

        <MobileFilterDrawer
          open={filtersDrawerOpen}
          onClose={() => setFiltersDrawerOpen(false)}
          title="Filtri magazzino"
          onReset={resetMagazzinoFilters}
        >
          <div className="relative w-full">
            <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" aria-hidden>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Cerca in descrizione, marca, codici…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 shadow-sm outline-none ring-orange-500/25 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
          <div className="space-y-3">
            <MagazzinoFilterSelect value={filtroMarca} onChange={setFiltroMarca}>
              <option value="__tutti__">Tutte le marche</option>
              {marche.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </MagazzinoFilterSelect>
            <MagazzinoFilterSelect value={filtroCategoria} onChange={setFiltroCategoria}>
              <option value="__tutti__">Tutte le categorie</option>
              {categorie.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </MagazzinoFilterSelect>
            <MagazzinoFilterSelect value={filtroCompat} onChange={setFiltroCompat}>
              <option value="__tutti__">Compatibilità modelli</option>
              {mezzi.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </MagazzinoFilterSelect>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
              checked={soloSottoScorta}
              onChange={(e) => setSoloSottoScorta(e.target.checked)}
            />
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Mostra solo ricambi sotto scorta minima</span>
          </label>
        </MobileFilterDrawer>

        <div className="mb-4 hidden flex-col gap-3 md:flex">
          <div className="relative w-full max-w-xl">
            <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" aria-hidden>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Cerca in descrizione, marca, codici, compatibilità…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 shadow-sm outline-none ring-orange-500/25 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openNewModal} className={`${erpBtnNuovaLavorazione} w-full sm:w-auto`} title="Aggiungi un ricambio">
              <span className="text-base font-semibold leading-none" aria-hidden>
                +
              </span>
              Nuovo Ricambio
            </button>
            <MagazzinoFilterSelect value={filtroMarca} onChange={setFiltroMarca}>
              <option value="__tutti__">Tutte le marche</option>
              {marche.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </MagazzinoFilterSelect>
            <MagazzinoFilterSelect value={filtroCategoria} onChange={setFiltroCategoria}>
              <option value="__tutti__">Tutte le categorie</option>
              {categorie.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </MagazzinoFilterSelect>
            <MagazzinoFilterSelect value={filtroCompat} onChange={setFiltroCompat}>
              <option value="__tutti__">Compatibilità modelli</option>
              {mezzi.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </MagazzinoFilterSelect>
            <button
              type="button"
              onClick={() => setSoloSottoScorta((v) => !v)}
              className={
                soloSottoScorta
                  ? `inline-flex items-center gap-2 rounded-lg border border-orange-400/80 bg-orange-50 px-2.5 py-2 text-xs font-medium text-orange-950 shadow-sm hover:bg-orange-100 hover:shadow-md hover:ring-2 hover:ring-orange-400/30 dark:border-orange-500/55 dark:bg-orange-950/45 dark:text-orange-50 dark:hover:bg-orange-950/65 dark:hover:ring-orange-500/35 ${erpFocus}`
                  : `${erpBtnNeutral} gap-2`
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  soloSottoScorta ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.85)]" : "bg-zinc-400"
                }`}
              />
              Sotto scorta minima
            </button>
            <span className="text-xs text-zinc-500 sm:ml-auto">{filteredSorted.length} risultati</span>
          </div>
        </div>

        <div className={`hidden ${dsTableWrap} ${dsScrollbar} md:block`}>
          <table className={`${dsTable} table-fixed min-w-[1100px] w-full text-left text-[13px] leading-snug text-zinc-900 dark:text-zinc-100`}>
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[22%]" />
              <col className="w-[9%]" />
              <col className="w-[6%]" />
              <col className="w-[8%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
              <tr>
                <SortTh
                  label="Marca"
                  columnKey="marca"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                />
                <SortTh
                  label="CODICE"
                  columnKey="codiceFornitoreOriginale"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                />
                <th className="px-3 py-2 align-middle text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Descrizione
                </th>
                <SortTh
                  label="Categoria"
                  columnKey="categoria"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                />
                <SortTh
                  label="Scorta"
                  columnKey="scorta"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                  headerClassName="text-center"
                  buttonClassName="w-full justify-center"
                />
                <th className="min-w-[7.5rem] whitespace-nowrap px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Scorta minima
                </th>
                <th className="px-3 py-2 align-middle text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Ultima modifica
                </th>
                <SortTh
                  label="P. vendita"
                  columnKey="prezzoVendita"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                />
                <SortTh
                  label="Consumo medio"
                  columnKey="consumoMedioMensile"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                  headerClassName="whitespace-nowrap"
                  buttonClassName="whitespace-nowrap"
                />
                <th className="px-3 py-2 text-right align-middle text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedMagazzino.map((p) => {
                const consumoRow = consumoMap.get(p.id);
                const avgM = consumoRow?.avgMonthly ?? null;
                const low = p.scorta < p.scortaMinima;
                const flash = flashRowId === p.id;
                return (
                  <tr
                    id={`magazzino-row-${p.id}`}
                    key={p.id}
                    className={[
                      dsTableRow,
                      rowStockBg(p),
                      flash
                        ? "bg-white/95 shadow-[inset_0_0_0_1px_rgba(228,228,231,0.95),0_0_20px_rgba(255,255,255,0.65)] transition-[background-color,box-shadow] duration-200 ease-out dark:bg-zinc-100/12 dark:shadow-[inset_0_0_0_1px_rgba(82,82,91,0.45),0_0_18px_rgba(255,255,255,0.06)]"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <td className={`px-3 py-2 align-middle font-medium ${rowStockBorderFirstTd(p)}`}>{p.marca}</td>
                    <td className="px-3 py-2 align-middle">
                      <span
                        className="inline-block max-w-full whitespace-nowrap rounded-md bg-zinc-100 px-2 py-1 font-mono text-[12px] font-semibold tracking-wide dark:bg-zinc-800"
                        title={p.codiceFornitoreOriginale}
                      >
                        {p.codiceFornitoreOriginale}
                      </span>
                    </td>
                    <td className="min-w-0 px-3 py-2 align-middle">
                      <div className="break-words font-medium leading-snug">{p.descrizione}</div>
                      <div className="mt-0.5 break-words text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                        {compatLabel(p.compatibilitaMezzi)}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle text-zinc-700 dark:text-zinc-300">{p.categoria}</td>
                    <td className="px-3 py-2 align-middle text-center">
                      <span
                        className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums ${
                          low
                            ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                            : p.scorta === p.scortaMinima
                              ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100"
                              : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {p.scorta}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle text-center font-mono text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
                      {p.scortaMinima}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {(() => {
                        const stale = isModificaOlderThanMonths(p.dataUltimaModifica, 6);
                        return (
                          <div
                            title={formatTimestampHover(p.dataUltimaModifica)}
                            className={`rounded-md px-1.5 py-1 ${
                              stale
                                ? "bg-amber-50/95 ring-1 ring-amber-200/80 dark:bg-amber-950/35 dark:ring-amber-800/55"
                                : ""
                            }`}
                          >
                            <div className="text-[13px] font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                              {formatDataUltimaMain(p.dataUltimaModifica)}
                            </div>
                            <div className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                              {p.autoreUltimaModifica}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 align-middle font-medium tabular-nums">{eur(p.prezzoVendita)}</td>
                    <td
                      className={`px-3 py-2 align-middle text-[13px] tabular-nums ${consumoCellTone(avgM, consumoAvgSortedAll)}`}
                      title={consumoRow?.insufficientReason ?? (avgM != null ? "Da log magazzino (uscite Δ scorta)" : undefined)}
                    >
                      {avgM != null ? formatAvgMonthlyMagazzinoIt(avgM) : "dati insufficienti"}
                    </td>
                    <td className="px-3 py-2 align-middle text-right">
                      <div className="inline-flex flex-nowrap items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openInfo(p)}
                          className={`${erpBtnSoftOrange} min-w-[2.25rem] px-2`}
                          title="Scheda informativa"
                          aria-label="Scheda informativa"
                        >
                          <span className="text-base leading-none" aria-hidden>
                            ℹ
                          </span>
                        </button>
                        <button type="button" onClick={() => adjustScorta(p.id, -1)} className={erpBtnIcon} title="Diminuisci scorta">
                          −
                        </button>
                        <button type="button" onClick={() => adjustScorta(p.id, 1)} className={erpBtnSoftOrange} title="Aumenta scorta">
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {pagedMagazzino.map((p) => {
            const consumoRow = consumoMap.get(p.id);
            const avgM = consumoRow?.avgMonthly ?? null;
            const low = p.scorta < p.scortaMinima;
            const flash = flashRowId === p.id;
            return (
              <div
                id={`magazzino-row-${p.id}`}
                key={p.id}
                className={[
                  "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90",
                  rowStockBg(p),
                  flash
                    ? "shadow-[inset_0_0_0_1px_rgba(251,146,60,0.45)] ring-2 ring-orange-400/35 dark:shadow-[inset_0_0_0_1px_rgba(234,88,12,0.35)] dark:ring-orange-500/30"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Ricambio</p>
                    <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{p.marca}</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-200">{p.codiceFornitoreOriginale}</p>
                  </div>
                  <span
                    className={`inline-flex min-h-11 min-w-[2.75rem] shrink-0 items-center justify-center rounded-full px-2 font-mono text-sm font-semibold tabular-nums ${
                      low
                        ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                        : p.scorta === p.scortaMinima
                          ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100"
                          : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {p.scorta}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{p.descrizione}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{compatLabel(p.compatibilitaMezzi)}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Categoria</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">{p.categoria}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Scorta minima</dt>
                    <dd className="font-mono font-medium tabular-nums text-zinc-800 dark:text-zinc-200">{p.scortaMinima}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">P. vendita</dt>
                    <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{eur(p.prezzoVendita)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Consumo medio</dt>
                    <dd
                      className={`font-medium tabular-nums ${consumoCellTone(avgM, consumoAvgSortedAll)}`}
                      title={consumoRow?.insufficientReason ?? (avgM != null ? "Da log magazzino (uscite Δ scorta)" : undefined)}
                    >
                      {avgM != null ? formatAvgMonthlyMagazzinoIt(avgM) : "dati insufficienti"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">Ultima modifica</dt>
                    <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {formatDataUltimaMain(p.dataUltimaModifica)} · {p.autoreUltimaModifica}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openInfo(p)}
                    className={`${erpBtnSoftOrange} min-h-11 min-w-11 px-3`}
                    title="Scheda informativa"
                    aria-label="Scheda informativa"
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      ℹ
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustScorta(p.id, -1)}
                    className={`${erpBtnIcon} min-h-11 min-w-11 text-base font-bold`}
                    title="Diminuisci scorta"
                    aria-label="Diminuisci scorta"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustScorta(p.id, 1)}
                    className={`${erpBtnSoftOrange} min-h-11 min-w-11 text-base font-bold`}
                    title="Aumenta scorta"
                    aria-label="Aumenta scorta"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {showPager ? (
          <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
        ) : null}
      </ShellCard>
      </div>

      {newOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setNewOpen(false);
            }
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-ricambio-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 id="new-ricambio-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Nuovo ricambio
              </h2>
              <button type="button" onClick={() => setNewOpen(false)} className={erpBtnNeutral}>
                Chiudi
              </button>
            </div>
            <form onSubmit={submitNew} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
                <RicambioFormFields
                  form={newForm}
                  setForm={setNewForm}
                  marcheOptions={marche}
                  categorieOptions={categorie}
                  mezziOptions={mezzi}
                  attrezzatureListe={mezziListePrefs}
                  relaxHtmlValidation
                  codiceOriginaleAvvisoDuplicato={
                    nuovoCodiceDupEsistente
                      ? {
                          existing: nuovoCodiceDupEsistente,
                          onVaiAlRicambio: () => focusRicambioInTable(nuovoCodiceDupEsistente.id),
                        }
                      : null
                  }
                />
              </div>
              <div className="shrink-0 space-y-2 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  type="submit"
                  className={`${erpBtnAccent} w-full disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale`}
                  disabled={nuovoCodiceBloccaSalvataggio}
                  title={nuovoCodiceBloccaSalvataggio ? "Correggi il codice o apri il ricambio esistente" : undefined}
                >
                  Salva in magazzino
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {newIncompleteOpen ? (
        <div
          className="fixed inset-0 z-[51] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setNewIncompleteOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ricambio-incomplete-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="ricambio-incomplete-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Attenzione: mancano alcune informazioni
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
              {newIncompleteList.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={erpBtnNeutral}
                onClick={() => {
                  setNewIncompleteOpen(false);
                }}
              >
                Torna a completare
              </button>
              <button
                type="button"
                className={erpBtnAccent}
                onClick={() => {
                  finalizeNewRicambio();
                }}
              >
                Conferma comunque
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detail && detailRicambio ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              closeDetail();
            }
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-ricambio-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 id="detail-ricambio-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {detail.mode === "info" ? "Scheda ricambio" : "Modifica ricambio"}
              </h2>
              <button type="button" onClick={closeDetail} className={erpBtnNeutral}>
                Chiudi
              </button>
            </div>

            {detail.mode === "info" ? (
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
                    Dati principali ricambio
                  </p>
                  <InfoRow label="Marca" value={detailRicambio.marca} />
                  <InfoRow
                    label="Cod. OE"
                    value={<span className="font-mono text-[13px] font-semibold tracking-wide">{detailRicambio.codiceFornitoreOriginale}</span>}
                  />
                  <InfoRow label="Descrizione" value={detailRicambio.descrizione} />
                  <InfoRow label="Note" value={detailRicambio.note || "—"} />
                  <InfoRow label="Categoria" value={detailRicambio.categoria} />
                  <InfoRow label="Compatibilità" value={compatLabel(detailRicambio.compatibilitaMezzi)} />
                </div>
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">Altri dettagli</p>
                  <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Giacenza</p>
                  <InfoRow label="Scorta" value={detailRicambio.scorta} />
                  <InfoRow label="Scorta minima" value={detailRicambio.scortaMinima} />
                  <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Consumo (log magazzino)</p>
                  {(() => {
                    const cx = consumoMap.get(detailRicambio.id);
                    return (
                      <>
                        <InfoRow
                          label="Consumo medio mensile"
                          value={cx?.avgMonthly != null ? formatAvgMonthlyMagazzinoIt(cx.avgMonthly) : "dati insufficienti"}
                        />
                        <InfoRow label="Ultimo mese consumato" value={formatMonthKeyIt(cx?.lastExitMonthKey ?? null)} />
                        <InfoRow
                          label="Mesi osservati"
                          value={cx && cx.monthsObserved > 0 ? String(cx.monthsObserved) : "—"}
                        />
                        <InfoRow
                          label="Autonomia stimata"
                          value={
                            <span title="Scorta attuale ÷ consumo medio mensile">
                              {formatAutonomiaMesi(detailRicambio.scorta, cx?.avgMonthly ?? null)}
                            </span>
                          }
                        />
                      </>
                    );
                  })()}
                  <InfoRow label="Capitale immob." value={eur(capitaleImmobilizzato(detailRicambio))} />
                  <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Audit</p>
                  <InfoRow
                    label="Ultima modifica"
                    value={new Date(detailRicambio.dataUltimaModifica).toLocaleString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  />
                  <InfoRow label="Autore" value={detailRicambio.autoreUltimaModifica} />
                </div>
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">Fornitore alternativo</p>
                  <InfoRow label="Nome" value={detailRicambio.fornitoreNonOriginale || "—"} />
                  <InfoRow
                    label="Codice"
                    value={
                      detailRicambio.codiceFornitoreNonOriginale ? (
                        <span className="font-mono">{detailRicambio.codiceFornitoreNonOriginale}</span>
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>
                <MagazzinoPrezziLineari
                  formatEur={eur}
                  listinoOE={detailRicambio.prezzoFornitoreOriginale}
                  scontoOE={detailRicambio.scontoFornitoreOriginale}
                  listinoAlt={detailRicambio.prezzoFornitoreNonOriginale}
                  scontoAlt={detailRicambio.scontoFornitoreNonOriginale}
                  markupPct={detailRicambio.markupPercentuale}
                  prezzoVendita={detailRicambio.prezzoVendita}
                />
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">Storico modifiche</p>
                  <ul className={`${gestionaleLogScrollEmbeddedClass} mt-2 max-h-56 space-y-2 pr-0.5`}>
                    {infoTimeline.map((ev) => (
                      <li key={ev.id} className="list-none">
                        <GestionaleLogEntryFourLines
                          vm={buildMagazzinoGestionaleLogViewModel(ev)}
                          trailing={
                            <button
                              type="button"
                              className={logEntryDismissBtnClass}
                              aria-label="Rimuovi voce dal log"
                              title="Rimuovi voce dal log"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Rimuovere questa voce dal log?")) removeMagazzinoLogEntry(ev.id);
                              }}
                            >
                              ×
                            </button>
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
                <button type="button" onClick={startEditFromInfo} className={`${erpBtnAccent} w-full`}>
                  Modifica
                </button>
              </div>
            ) : (
              <form onSubmit={saveEdit} className="flex min-h-0 flex-1 flex-col">
                {editDraft ? (
                  <>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
                      <RicambioFormFields
                        form={editDraft}
                        setForm={setEditForm}
                        marcheOptions={marche}
                        categorieOptions={categorie}
                        mezziOptions={mezzi}
                        attrezzatureListe={mezziListePrefs}
                      />
                      {detailRicambio ? (
                        <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                          <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
                            Consumo e autonomia (stima)
                          </p>
                          {(() => {
                            const cx = consumoMap.get(detailRicambio.id);
                            const scortaDraft = Math.max(0, Math.round(Number.parseInt(editDraft.scorta, 10) || 0));
                            return (
                              <>
                                <InfoRow
                                  label="Consumo medio mensile"
                                  value={cx?.avgMonthly != null ? formatAvgMonthlyMagazzinoIt(cx.avgMonthly) : "dati insufficienti"}
                                />
                                <InfoRow label="Ultimo mese consumato" value={formatMonthKeyIt(cx?.lastExitMonthKey ?? null)} />
                                <InfoRow
                                  label="Mesi osservati"
                                  value={cx && cx.monthsObserved > 0 ? String(cx.monthsObserved) : "—"}
                                />
                                <InfoRow
                                  label="Autonomia stimata"
                                  value={
                                    <span title="Scorta nel modulo ÷ consumo medio mensile">
                                      {formatAutonomiaMesi(scortaDraft, cx?.avgMonthly ?? null)}
                                    </span>
                                  }
                                />
                              </>
                            );
                          })()}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 space-y-2 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button type="submit" className={`${erpBtnAccent} flex-1`}>
                          Salva
                        </button>
                        <button type="button" onClick={cancelEditBackToInfo} className={`${erpBtnNeutral} flex-1 sm:flex-initial`}>
                          Annulla
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={eliminaRicambio}
                        className={`w-full rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100 hover:shadow-md hover:ring-1 hover:ring-red-200/60 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/55 ${erpFocus}`}
                      >
                        Elimina ricambio
                      </button>
                    </div>
                  </>
                ) : null}
              </form>
            )}
          </div>
        </div>
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
          <aside
            className={gestionaleLogPanelAsideClass}
            aria-label="Log modifiche magazzino"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={gestionaleLogPanelHeaderClass}>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log modifiche</h2>
              <button type="button" onClick={() => setLogOpen(false)} className={erpBtnNeutral}>
                Chiudi
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
              <div className={`${gestionaleLogScrollClass} min-h-0 flex-1`}>
              {logEntries.length === 0 ? (
                <GestionaleLogEmpty message="Nessuna modifica registrata in questa sessione." />
              ) : (
                <GestionaleLogList>
                  {pagedMagLogEntries.map((entry) => (
                    <li key={entry.id} className="list-none">
                      <GestionaleLogEntryFourLines
                        vm={buildMagazzinoGestionaleLogViewModel(entry)}
                        onClick={() => focusRicambioInTable(entry.ricambioId)}
                        title="Mostra ricambio in tabella"
                        trailing={
                          <button
                            type="button"
                            className={logEntryDismissBtnClass}
                            aria-label="Rimuovi voce dal log"
                            title="Rimuovi voce dal log"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Rimuovere questa voce dal log?")) removeMagazzinoLogEntry(entry.id);
                            }}
                          >
                            ×
                          </button>
                        }
                      />
                    </li>
                  ))}
                </GestionaleLogList>
              )}
              </div>
              {showMagLogPager ? (
                <TablePagination page={magLogPage} pageCount={magLogPageCount} onPageChange={setMagLogPage} label={magLogPagerLabel} />
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {dupCheckModalOpen ? (
        <div
          className="fixed inset-0 z-[56] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setDupCheckModalOpen(false);
            }
          }}
        >
          <div
            className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dup-magazzino-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h2 id="dup-magazzino-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Codici duplicati in archivio
              </h2>
              <button type="button" onClick={() => setDupCheckModalOpen(false)} className={erpBtnNeutral}>
                Chiudi
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
              {archivioDupCodeGroups.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Nessun codice duplicato rilevato.</p>
              ) : (
                <ul className="space-y-4">
                  {archivioDupCodeGroups.map((g: MagazzinoArchiveDuplicateCodeGroup) => (
                    <li
                      key={g.normalizedKey}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-800/30"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
                        Codice <span className="font-mono normal-case">{g.labelCode}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {g.items.length} ricambi con lo stesso codice normalizzato
                      </p>
                      <ul className="mt-2 space-y-2">
                        {g.items.map((p) => (
                          <li key={p.id}>
                            <ArchiveDupRicambioRow p={p} onOpen={(id) => focusRicambioInTable(id)} />
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
