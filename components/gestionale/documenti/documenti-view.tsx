"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MOCK_DOCUMENTI } from "@/lib/mock-data/documenti";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import { PageHeader } from "@/components/gestionale/page-header";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  appendDocumentiChangeLog,
  loadDocumentiChangeLog,
  removeDocumentiChangeLogEntryById,
  type DocumentiLogStored,
} from "@/lib/documenti/documenti-change-log-storage";
import { CAB_DOCUMENTI_LOG_REFRESH } from "@/lib/sistema/cab-events";
import {
  erpBtnNeutral,
  erpBtnNuovaLavorazione,
  erpFocus,
  FilterSelectWrap,
  selectLavorazioniFilter,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnDanger, dsBtnNeutral, dsInput, dsPageToolbarBtn, dsStackPage, dsStickyToolbar } from "@/lib/ui/design-system";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
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
import { buildModificaRigaFromChanges, type CampoChangeLike } from "@/lib/gestionale-log/view-model";
import { useAuth } from "@/context/auth-context";
import {
  buildDocumentiViewTree,
  compareDocs,
  docMatchesFilters,
  docMatchesSearch,
  documentoCollocatoInCatalogo,
  formatDocumentoRigaSintetica,
  getDocumentApriHref,
  labelCategoria,
  labelTipoFile,
  partitionMarcaLevelDocs,
  resolveDocumentoApplicazione,
  type DocumentiSortKey,
  type DocumentiSortPhase,
} from "@/components/gestionale/documenti/documenti-helpers";
import { DocumentoEditModal, DocumentoInfoModal, UploadDocumentoModal } from "@/components/gestionale/documenti/documenti-modals";
import { buildDocumentiCatalogFromImpostazioni } from "@/lib/documenti/documenti-catalog";
import { getMezziListePrefsOrDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { getMezziReportSnapshot, subscribeMezziReportSync } from "@/lib/mezzi/mezzi-report-sync";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { CAB_MEZZI_LISTE_REFRESH } from "@/lib/sistema/cab-events";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";

/** Preferenza ultima azione “comprimi / espandi tutto” sull’albero documenti. */
const DOCUMENTI_TREE_PREF_KEY = "cab-documenti-tree-pref";

function readDocumentiTreePref(): "collapsed" | "expanded" | "default" {
  if (typeof window === "undefined") return "default";
  try {
    const v = window.localStorage.getItem(DOCUMENTI_TREE_PREF_KEY);
    if (v === "collapsed") return "collapsed";
    if (v === "expanded") return "expanded";
  } catch {
    /* ignore */
  }
  return "default";
}

function writeDocumentiTreePref(v: "collapsed" | "expanded") {
  try {
    window.localStorage.setItem(DOCUMENTI_TREE_PREF_KEY, v);
  } catch {
    /* ignore */
  }
}

function fmtDocVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.trim() || "—";
  return String(v);
}

function diffDocumentiMetadati(before: DocumentoGestionale, after: DocumentoGestionale): CampoChangeLike[] {
  const out: CampoChangeLike[] = [];
  const push = (campo: string, a: unknown, b: unknown) => {
    const pa = fmtDocVal(a);
    const pb = fmtDocVal(b);
    if (pa !== pb) out.push({ campo, prima: pa, dopo: pb });
  };
  push("Nome", before.nome, after.nome);
  push("Categoria", labelCategoria(before.categoria), labelCategoria(after.categoria));
  push("Note", before.note ?? "", after.note ?? "");
  push("Ambito", before.applicabilita ?? "", after.applicabilita ?? "");
  push("Marca (assegnazione)", before.marcaKey ?? before.marca, after.marcaKey ?? after.marca);
  push("Modello (assegnazione)", before.modelloKey ?? before.macchina, after.modelloKey ?? after.macchina);
  push("Id mezzo", before.mezzoId ?? "", after.mezzoId ?? "");
  push("Marca (legacy)", before.marca, after.marca);
  push("Modello (legacy)", before.macchina, after.macchina);
  push("Dimensione (KB)", before.dimensioneKb, after.dimensioneKb);
  return out;
}

function maxDocNumericId(docs: DocumentoGestionale[]): number {
  return docs.reduce((max, d) => {
    const m = /^doc-(\d+)$/.exec(d.id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
}

function DocGlyph({ doc }: { doc: DocumentoGestionale }) {
  const base =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[9px] font-bold uppercase tracking-tight shadow-sm";
  const byCat =
    doc.categoria === "listini"
      ? "border-amber-200/90 bg-gradient-to-br from-amber-50 to-amber-100/80 text-amber-900 dark:border-amber-800/60 dark:from-amber-950/80 dark:to-amber-900/40 dark:text-amber-100"
      : doc.categoria === "cataloghi"
        ? "border-sky-200/90 bg-gradient-to-br from-sky-50 to-sky-100/80 text-sky-900 dark:border-sky-800/60 dark:from-sky-950/80 dark:to-sky-900/40 dark:text-sky-100"
        : doc.categoria === "manuali"
          ? "border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-emerald-100/80 text-emerald-900 dark:border-emerald-800/60 dark:from-emerald-950/80 dark:to-emerald-900/40 dark:text-emerald-100"
          : "border-zinc-200/90 bg-gradient-to-br from-zinc-50 to-zinc-100/80 text-zinc-700 dark:border-zinc-600 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-200";
  const icon =
    doc.categoria === "listini" ? (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ) : doc.categoria === "cataloghi" ? (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path d="M4 6h16M4 12h10M4 18h16" />
      </svg>
    ) : doc.categoria === "manuali" ? (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        <path d="M8 7h8M8 11h6" />
      </svg>
    ) : doc.tipoFile === "pdf" ? (
      <span aria-hidden>PDF</span>
    ) : (
      <span aria-hidden>{doc.tipoFile === "immagine" ? "IMG" : "FILE"}</span>
    );
  return (
    <div className={`${base} ${byCat}`} title={`${labelCategoria(doc.categoria)} · ${labelTipoFile(doc.tipoFile)}`}>
      {icon}
    </div>
  );
}

function MarcaGlyph({ nome }: { nome: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] text-[10px] font-bold text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)]">
      {nome.slice(0, 2).toUpperCase()}
    </span>
  );
}

function ArchiveDocRow({
  doc,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onInfo,
  onToast,
  onApri,
}: {
  doc: DocumentoGestionale;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onInfo: () => void;
  onToast: (s: string) => void;
  onApri: () => void;
}) {
  const href = getDocumentApriHref(doc);
  const iconAct = `${dsBtnNeutral} inline-flex h-8 w-8 shrink-0 items-center justify-center p-0`;

  return (
    <li
      id={`documento-row-${doc.id}`}
      role="option"
      aria-selected={selected}
      className={`group flex cursor-pointer items-center gap-2.5 border-b border-[color:var(--cab-border)] px-2.5 py-2 transition-[background-color] duration-150 last:border-b-0 ${
        selected
          ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]"
          : "hover:bg-[var(--cab-hover)]"
      }`}
      onClick={onSelect}
    >
      <DocGlyph doc={doc} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[color:var(--cab-text)]">{doc.nome}</p>
        <p className="mt-0.5 truncate text-[11px] text-[color:var(--cab-text-muted)]">
          {formatDocumentoRigaSintetica(doc)} · {labelCategoria(doc.categoria)} · {labelTipoFile(doc.tipoFile)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`${iconAct} ${erpFocus}`}
          title="Apri file"
          aria-label="Apri file"
          disabled={!href}
          onClick={() => {
            if (!href) onToast("File non disponibile");
            else onApri();
          }}
        >
          <svg className="h-4 w-4 opacity-85" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
        <button
          type="button"
          className={`${iconAct} ${erpFocus}`}
          title="Scheda documento"
          aria-label="Visualizza scheda documento"
          onClick={onInfo}
        >
          <svg className="h-4 w-4 opacity-85" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button type="button" className={`${iconAct} ${erpFocus}`} title="Modifica" aria-label="Modifica documento" onClick={onEdit}>
          <svg className="h-4 w-4 opacity-85" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          type="button"
          className={`${dsBtnDanger} inline-flex h-8 w-8 shrink-0 items-center justify-center p-0 ${erpFocus}`}
          title="Elimina"
          aria-label="Elimina documento"
          onClick={onDelete}
        >
          <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </li>
  );
}

function SubTreeHeading({ title }: { title: string }) {
  return (
    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">{title}</h3>
  );
}

export function DocumentiView() {
  const searchParams = useSearchParams();
  const { authorName: author } = useAuth();
  const authorTrim = author.trim() || "Operatore";
  const [mezziSnap, setMezziSnap] = useState<MezzoGestito[]>(() => getMezziReportSnapshot());
  const [listeRev, setListeRev] = useState(0);

  const catalog = useMemo(() => {
    void listeRev;
    return buildDocumentiCatalogFromImpostazioni(getMezziListePrefsOrDefault(), mezziSnap);
  }, [mezziSnap, listeRev]);

  const [docs, setDocs] = useState<DocumentoGestionale[]>(() => MOCK_DOCUMENTI.map((d) => resolveDocumentoApplicazione({ ...d })));
  const idSeq = useRef(maxDocNumericId(MOCK_DOCUMENTI));

  const [search, setSearch] = useState("");
  const [filtroMarca, setFiltroMarca] = useState<string>("__tutti__");
  const [filtroModello, setFiltroModello] = useState<string>("__tutti__");
  const [filtroMezzoId, setFiltroMezzoId] = useState<string>("__tutti__");
  const [filtroCategoria, setFiltroCategoria] = useState<DocumentoGestionale["categoria"] | "__tutti__">("__tutti__");
  const [filtriEspansi, setFiltriEspansi] = useState(false);

  const [sortColumn, setSortColumn] = useState<DocumentiSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<DocumentiSortPhase>("natural");

  const [expandedMarche, setExpandedMarche] = useState<Set<string>>(() => new Set());
  const [expandedModelli, setExpandedModelli] = useState<Set<string>>(() => new Set());
  const [expandedMezzi, setExpandedMezzi] = useState<Set<string>>(() => new Set());
  const documentiMarcheInitDone = useRef(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [infoDoc, setInfoDoc] = useState<DocumentoGestionale | null>(null);
  const [editDoc, setEditDoc] = useState<DocumentoGestionale | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<DocumentiLogStored[]>(() => loadDocumentiChangeLog());

  useEffect(() => {
    return subscribeMezziReportSync(() => setMezziSnap(getMezziReportSnapshot()));
  }, []);

  useEffect(() => {
    function onLogRefresh() {
      setLogEntries(loadDocumentiChangeLog());
    }
    window.addEventListener(CAB_DOCUMENTI_LOG_REFRESH, onLogRefresh);
    return () => window.removeEventListener(CAB_DOCUMENTI_LOG_REFRESH, onLogRefresh);
  }, []);

  useEffect(() => {
    if (logOpen) setLogEntries(loadDocumentiChangeLog());
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
    function onListe() {
      setListeRev((n) => n + 1);
    }
    window.addEventListener(CAB_MEZZI_LISTE_REFRESH, onListe);
    return () => window.removeEventListener(CAB_MEZZI_LISTE_REFRESH, onListe);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const raw = searchParams.get("q");
    if (raw && raw.trim()) setSearch(decodeURIComponent(raw.trim()));
  }, [searchParams]);

  useEffect(() => {
    const mid = searchParams.get("mezzoId")?.trim();
    if (!mid) return;
    setFiltroMezzoId(mid);
    const mezzo = mezziSnap.find((m) => m.id === mid);
    if (!mezzo) return;
    const mar = catalog.find((c) => c.nome.trim().toLowerCase() === mezzo.marca.trim().toLowerCase());
    if (!mar) return;
    setExpandedMarche((p) => new Set(p).add(mar.id));
    const mac = mar.macchine.find((x) => x.nome.trim().toLowerCase() === mezzo.modello.trim().toLowerCase());
    if (!mac) return;
    setExpandedModelli((p) => new Set(p).add(`${mar.id}::${mac.id}`));
    setExpandedMezzi((p) => new Set(p).add(`${mar.id}::${mac.id}::${mezzo.id}`));
  }, [searchParams, mezziSnap, catalog]);

  useEffect(() => {
    if (catalog.length === 0 || documentiMarcheInitDone.current) return;
    documentiMarcheInitDone.current = true;
    if (readDocumentiTreePref() === "collapsed") return;
    setExpandedMarche(new Set(catalog.map((m) => m.id)));
  }, [catalog]);

  const searchActive = search.trim().length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter(
      (d) =>
        docMatchesFilters(d, catalog, {
          filtroMarca,
          filtroModello,
          filtroMezzoId,
          filtroCategoria,
          filtroTipo: "__tutti__",
        }) && docMatchesSearch(d, catalog, q),
    );
  }, [docs, catalog, search, filtroMarca, filtroModello, filtroMezzoId, filtroCategoria]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => compareDocs(a, b, sortColumn, sortPhase));
    return rows;
  }, [filtered, sortColumn, sortPhase]);

  const listPageSize = useResponsiveListPageSize();
  const docListDeps = useMemo(
    () => `${search}|${filtroMarca}|${filtroModello}|${filtroMezzoId}|${filtroCategoria}|${sortColumn ?? ""}|${sortPhase}|${sorted.length}`,
    [search, filtroMarca, filtroModello, filtroMezzoId, filtroCategoria, sortColumn, sortPhase, sorted.length],
  );
  const {
    page: docPage,
    setPage: setDocPage,
    pageCount: docPageCount,
    sliceItems: sliceSortedDocs,
    showPager: showDocPager,
    label: docPagerLabel,
    resetPage: resetDocPage,
  } = useClientPagination(sorted.length, listPageSize);
  useEffect(() => {
    resetDocPage();
  }, [docListDeps, listPageSize, resetDocPage]);
  const sortedPaged = useMemo(() => sliceSortedDocs(sorted), [sorted, sliceSortedDocs, docPage]);

  const {
    page: docLogPage,
    setPage: setDocLogPage,
    pageCount: docLogPageCount,
    sliceItems: sliceDocLogEntries,
    showPager: showDocLogPager,
    label: docLogPagerLabel,
    resetPage: resetDocLogPage,
  } = useClientPagination(logEntries.length, listPageSize);
  useEffect(() => {
    resetDocLogPage();
  }, [logOpen, logEntries.length, listPageSize, resetDocLogPage]);
  const pagedDocLogEntries = useMemo(() => sliceDocLogEntries(logEntries), [logEntries, sliceDocLogEntries, docLogPage]);

  const tree = useMemo(
    () => buildDocumentiViewTree(catalog, mezziSnap, sortedPaged, sortColumn, sortPhase),
    [catalog, mezziSnap, sortedPaged, sortColumn, sortPhase],
  );

  const documentiSenzaCollocazione = useMemo(
    () => sorted.filter((d) => !documentoCollocatoInCatalogo(d, catalog, mezziSnap)),
    [sorted, catalog, mezziSnap],
  );

  useEffect(() => {
    if (selectedDocId && !sortedPaged.some((d) => d.id === selectedDocId)) setSelectedDocId(null);
  }, [sortedPaged, selectedDocId]);

  const didAutoExpandTree = useRef(false);
  useEffect(() => {
    if (didAutoExpandTree.current) return;
    if (tree.length === 0) return;
    if (readDocumentiTreePref() === "collapsed") {
      didAutoExpandTree.current = true;
      return;
    }
    const modKeys = new Set<string>();
    const mezKeys = new Set<string>();
    for (const { marca, modelli } of tree) {
      for (const mod of modelli) {
        const mk = `${marca.id}::${mod.modello.id}`;
        if (mod.files.length > 0 || mod.mezzi.some((m) => m.files.length > 0)) modKeys.add(mk);
        for (const { mezzo, files } of mod.mezzi) {
          if (files.length > 0) mezKeys.add(`${marca.id}::${mod.modello.id}::${mezzo.id}`);
        }
      }
    }
    if (modKeys.size === 0 && mezKeys.size === 0) return;
    setExpandedModelli((p) => new Set([...p, ...modKeys]));
    setExpandedMezzi((p) => new Set([...p, ...mezKeys]));
    didAutoExpandTree.current = true;
  }, [tree]);

  const modelliFilterOptions = useMemo(() => {
    if (filtroMarca === "__tutti__") {
      return catalog.flatMap((m) => m.macchine.map((mac) => ({ id: mac.id, label: `${m.nome} — ${mac.nome}` })));
    }
    const mar = catalog.find((m) => m.id === filtroMarca);
    return (mar?.macchine ?? []).map((mac) => ({ id: mac.id, label: mac.nome }));
  }, [catalog, filtroMarca]);

  const mezziFilterOptions = useMemo(() => {
    if (filtroMarca === "__tutti__" || filtroModello === "__tutti__") {
      return mezziSnap.map((z) => ({
        id: z.id,
        label: `${z.marca} ${z.modello} · ${z.targa || "—"} / ${z.matricola || "—"}`,
      }));
    }
    const mar = catalog.find((m) => m.id === filtroMarca);
    const mac = mar?.macchine.find((x) => x.id === filtroModello);
    if (!mar || !mac) return [];
    return mezziSnap
      .filter((z) => z.marca.trim().toLowerCase() === mar.nome.trim().toLowerCase() && z.modello.trim().toLowerCase() === mac.nome.trim().toLowerCase())
      .map((z) => ({
        id: z.id,
        label: `${z.targa || "—"} / ${z.matricola || "—"}`,
      }));
  }, [catalog, filtroMarca, filtroModello, mezziSnap]);

  const sortSelectValue = useMemo(() => {
    if (sortColumn === null || sortPhase === "natural") return "natural";
    return `${sortColumn}:${sortPhase}`;
  }, [sortColumn, sortPhase]);

  const onSortSelect = useCallback((v: string) => {
    if (v === "natural") {
      setSortColumn(null);
      setSortPhase("natural");
      return;
    }
    const [col, ph] = v.split(":") as [DocumentiSortKey, DocumentiSortPhase];
    setSortColumn(col);
    setSortPhase(ph === "desc" ? "desc" : "asc");
  }, []);

  const nextId = useCallback(() => {
    idSeq.current += 1;
    return `doc-${idSeq.current}`;
  }, []);

  const handleUpload = useCallback(
    (payload: Omit<DocumentoGestionale, "id">) => {
      const id = nextId();
      const row: DocumentoGestionale = { ...payload, id };
      setDocs((prev) => [row, ...prev]);
      appendDocumentiChangeLog({
        tone: "create",
        tipoRiga: "CARICAMENTO",
        oggettoRiga: `Documento: ${row.nome}`,
        modificaRiga: `Upload in archivio. Categoria: ${labelCategoria(row.categoria)}.`,
        autore: authorTrim,
        atIso: new Date().toISOString(),
      });
    },
    [nextId, authorTrim],
  );

  const handleSaveEdit = useCallback(
    (next: DocumentoGestionale) => {
      const old = docs.find((d) => d.id === next.id);
      if (old) {
        const changes = diffDocumentiMetadati(old, next);
        if (changes.length > 0) {
          appendDocumentiChangeLog({
            tone: "update",
            tipoRiga: "MODIFICA",
            oggettoRiga: `Documento: ${next.nome}`,
            modificaRiga: buildModificaRigaFromChanges(changes),
            autore: authorTrim,
            atIso: new Date().toISOString(),
          });
        }
      }
      setDocs((prev) => prev.map((d) => (d.id === next.id ? next : d)));
    },
    [docs, authorTrim],
  );

  const handleDelete = useCallback((victim: DocumentoGestionale) => {
    const ok = window.confirm("Eliminare definitivamente questo documento?");
    if (!ok) return;
    appendDocumentiChangeLog({
      tone: "delete",
      tipoRiga: "ELIMINAZIONE",
      oggettoRiga: `Documento: ${victim.nome}`,
      modificaRiga: `Rimosso dall’archivio. Categoria: ${labelCategoria(victim.categoria)}.`,
      autore: authorTrim,
      atIso: new Date().toISOString(),
    });
    const blob = victim.urlBlob;
    if (blob) {
      try {
        URL.revokeObjectURL(blob);
      } catch {
        /* ignore */
      }
    }
    setDocs((prev) => prev.filter((d) => d.id !== victim.id));
    setSelectedDocId((cur) => (cur === victim.id ? null : cur));
    setInfoDoc((d) => (d?.id === victim.id ? null : d));
    setEditDoc((d) => (d?.id === victim.id ? null : d));
  }, [authorTrim]);

  function openDoc(doc: DocumentoGestionale) {
    const href = getDocumentApriHref(doc);
    if (!href) {
      setToast("File non disponibile");
      return;
    }
    openUrlInNewTab(href, { revokeBlobUrlAfterMs: href.startsWith("blob:") ? 120_000 : undefined });
  }

  function toggleMarca(id: string) {
    setExpandedMarche((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleModello(key: string) {
    setExpandedModelli((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  function toggleMezzo(key: string) {
    setExpandedMezzi((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  const collapseAllTreeGroups = useCallback(() => {
    setExpandedMarche(new Set());
    setExpandedModelli(new Set());
    setExpandedMezzi(new Set());
    writeDocumentiTreePref("collapsed");
  }, []);

  const expandAllTreeGroups = useCallback(() => {
    const mar = new Set<string>();
    const mod = new Set<string>();
    const mez = new Set<string>();
    for (const { marca, modelli } of tree) {
      mar.add(marca.id);
      for (const { modello, mezzi } of modelli) {
        mod.add(`${marca.id}::${modello.id}`);
        for (const { mezzo } of mezzi) {
          mez.add(`${marca.id}::${modello.id}::${mezzo.id}`);
        }
      }
    }
    setExpandedMarche(mar);
    setExpandedModelli(mod);
    setExpandedMezzi(mez);
    writeDocumentiTreePref("expanded");
  }, [tree]);

  function marcaOpen(id: string) {
    return searchActive || expandedMarche.has(id);
  }

  function modelloOpen(marcaId: string, modelloId: string) {
    return searchActive || expandedModelli.has(`${marcaId}::${modelloId}`);
  }

  function mezzoOpen(marcaId: string, modelloId: string, mezzoId: string) {
    return searchActive || expandedMezzi.has(`${marcaId}::${modelloId}::${mezzoId}`);
  }

  const resetFiltri = useCallback(() => {
    setSearch("");
    setFiltroMarca("__tutti__");
    setFiltroModello("__tutti__");
    setFiltroMezzoId("__tutti__");
    setFiltroCategoria("__tutti__");
    setFiltriEspansi(false);
  }, []);

  const hasDocFilters =
    filtroMarca !== "__tutti__" ||
    filtroModello !== "__tutti__" ||
    filtroMezzoId !== "__tutti__" ||
    filtroCategoria !== "__tutti__";

  return (
    <>
      <PageHeader
        title="Documenti"
        actions={
          <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
              title="Storico modifiche documenti (ultime 200)"
            >
              <IconGestionaleLog />
              <span className="sr-only">Log modifiche</span>
            </button>
          </div>
        }
      />

      <div className={dsStackPage}>
        <div className={`${dsStickyToolbar} -mx-1`}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button type="button" onClick={() => setUploadOpen(true)} className={`${erpBtnNuovaLavorazione} h-11 shrink-0`}>
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Carica documento
              </button>
              <div className="relative min-h-11 min-w-0 flex-1 sm:min-w-[12rem]">
                <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[color:var(--cab-text-muted)]" aria-hidden>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca per nome file, marca, modello…"
                  className={`${dsInput} h-11 min-h-11 w-full py-0 pl-10 pr-3 text-sm ${erpFocus}`}
                  aria-label="Cerca documenti"
                />
              </div>
              <button
                type="button"
                onClick={() => setFiltriEspansi((o) => !o)}
                className={`${dsPageToolbarBtn} relative h-11 min-w-[8.25rem] shrink-0 gap-2 px-3 text-sm sm:ml-auto`}
                aria-expanded={filtriEspansi}
              >
                Filtri
                <svg
                  className={`h-4 w-4 shrink-0 text-[color:var(--cab-primary)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${filtriEspansi ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                {hasDocFilters ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--cab-primary)] ring-2 ring-[var(--cab-surface)]"
                    title="Filtri attivi"
                    aria-hidden
                  ></span>
                ) : null}
              </button>
            </div>

            <div className="flex flex-col gap-2 border-t border-[color:var(--cab-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex items-baseline gap-1 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-surface)] px-2.5 py-1 text-xs text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)]">
                  <span className="tabular-nums text-sm font-semibold text-[color:var(--cab-text)]">{sorted.length}</span>
                  <span>risultat{sorted.length === 1 ? "o" : "i"}</span>
                </span>
                {hasDocFilters ? (
                  <span className="rounded-md bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))]">
                    Filtri attivi
                  </span>
                ) : null}
              </div>
              {showDocPager ? (
                <p className="max-w-full text-[11px] leading-snug text-[color:var(--cab-text-muted)] sm:max-w-[28rem] sm:text-right">
                  L&apos;albero segue la pagina corrente; «Senza collocazione» elenca tutti i documenti filtrati senza anagrafica.
                </p>
              ) : null}
            </div>
          </div>

          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              filtriEspansi ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="border-t border-[color:var(--cab-border)] pt-3" aria-label="Filtri documenti">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Marca</label>
                    <FilterSelectWrap>
                      <select
                        className={`${selectLavorazioniFilter} h-10 w-full py-0 text-sm`}
                        value={filtroMarca}
                        onChange={(e) => {
                          setFiltroMarca(e.target.value);
                          setFiltroModello("__tutti__");
                          setFiltroMezzoId("__tutti__");
                        }}
                        aria-label="Filtra per marca"
                      >
                        <option value="__tutti__">Tutte le marche</option>
                        {catalog.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                    </FilterSelectWrap>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Modello</label>
                    <FilterSelectWrap>
                      <select
                        className={`${selectLavorazioniFilter} h-10 w-full py-0 text-sm`}
                        value={filtroModello}
                        onChange={(e) => {
                          setFiltroModello(e.target.value);
                          setFiltroMezzoId("__tutti__");
                        }}
                        aria-label="Filtra per modello"
                      >
                        <option value="__tutti__">Tutti i modelli</option>
                        {modelliFilterOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </FilterSelectWrap>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Macchina</label>
                    <FilterSelectWrap>
                      <select
                        className={`${selectLavorazioniFilter} h-10 w-full py-0 text-sm`}
                        value={filtroMezzoId}
                        onChange={(e) => setFiltroMezzoId(e.target.value)}
                        aria-label="Filtra per macchina"
                      >
                        <option value="__tutti__">Tutte le macchine</option>
                        {mezziFilterOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </FilterSelectWrap>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Ordinamento</label>
                    <FilterSelectWrap>
                      <select
                        className={`${selectLavorazioniFilter} h-10 w-full py-0 text-sm`}
                        value={sortSelectValue}
                        onChange={(e) => onSortSelect(e.target.value)}
                        aria-label="Ordinamento"
                      >
                        <option value="natural">Archivio (marca → modello)</option>
                        <option value="nome:asc">Nome A → Z</option>
                        <option value="nome:desc">Nome Z → A</option>
                        <option value="caricatoIl:desc">Data più recente</option>
                        <option value="caricatoIl:asc">Data meno recente</option>
                        <option value="categoria:asc">Categoria A → Z</option>
                        <option value="marca:asc">Marca A → Z</option>
                        <option value="macchina:asc">Modello A → Z</option>
                      </select>
                    </FilterSelectWrap>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Categoria</p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["__tutti__", "Tutte"],
                          ["listini", "Listini"],
                          ["cataloghi", "Cataloghi"],
                          ["manuali", "Manuali"],
                          ["altro", "Altro"],
                        ] as const
                      ).map(([value, label]) => {
                        const on = filtroCategoria === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFiltroCategoria(value)}
                            className={`rounded-[var(--ds-radius-lg)] border px-3 py-2 text-xs font-semibold transition-colors ${
                              on
                                ? "border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)]"
                                : "border-[color:var(--cab-border)] bg-[var(--cab-surface)] text-[color:var(--cab-text)] hover:border-[color:var(--cab-border-strong)] hover:bg-[var(--cab-hover)]"
                            } ${erpFocus}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={resetFiltri} className={`${erpBtnNeutral} py-2 text-xs font-semibold`}>
                    Reimposta filtri
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="min-w-0" aria-label="Albero documenti">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-[color:var(--cab-text)]">Elenco</h2>
            {sorted.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={collapseAllTreeGroups} className={`${dsPageToolbarBtn} h-9 px-3 text-xs`} title="Chiudi tutti i gruppi">
                  Comprimi tutto
                </button>
                <button type="button" onClick={expandAllTreeGroups} className={`${dsPageToolbarBtn} h-9 px-3 text-xs`} title="Apri tutti i gruppi della pagina">
                  Espandi tutto
                </button>
              </div>
            ) : null}
          </div>
          <div className="rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]">
              {sorted.length === 0 ? (
                <p className="p-8 text-center text-sm text-[color:var(--cab-text-muted)]">Nessun documento corrisponde ai filtri.</p>
              ) : (
                <div className="divide-y divide-[color:var(--cab-border)]">
                  {tree.map(({ marca, filesMarca, modelli }) => {
                    const { listini, altriMarca } = partitionMarcaLevelDocs(filesMarca);
                    return (
                      <div key={marca.id} className="bg-[var(--cab-surface)]">
                        <button
                          type="button"
                          onClick={() => toggleMarca(marca.id)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--cab-hover)] sm:px-4"
                          aria-expanded={marcaOpen(marca.id)}
                        >
                          <MarcaGlyph nome={marca.nome} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[color:var(--cab-text)]">{marca.nome}</p>
                            <p className="text-[11px] text-[color:var(--cab-text-muted)]">
                              {modelli.length} modell{modelli.length === 1 ? "o" : "i"}
                            </p>
                          </div>
                          <svg
                            className={`h-5 w-5 shrink-0 text-[color:var(--cab-text-muted)] transition-transform duration-200 ${marcaOpen(marca.id) ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${marcaOpen(marca.id) ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                          <div className="min-h-0 overflow-hidden">
                            <div className="space-y-4 border-t border-[color:var(--cab-border)] bg-[var(--cab-surface-2)]/35 px-2 pb-3 pt-2 sm:px-4">
                              {listini.length > 0 ? (
                                <div>
                                  <SubTreeHeading title="Listini" />
                                  <ul className="mt-1 space-y-0.5 pl-0 sm:pl-1" role="listbox">
                                    {listini.map((d) => (
                                      <ArchiveDocRow
                                        key={d.id}
                                        doc={d}
                                        selected={selectedDocId === d.id}
                                        onSelect={() => setSelectedDocId(d.id)}
                                        onEdit={() => setEditDoc(d)}
                                        onDelete={() => handleDelete(d)}
                                        onInfo={() => setInfoDoc(d)}
                                        onToast={setToast}
                                        onApri={() => openDoc(d)}
                                      />
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {altriMarca.length > 0 ? (
                                <div>
                                  <SubTreeHeading title="Generali (marca)" />
                                  <ul className="mt-1 space-y-0.5 pl-0 sm:pl-1" role="listbox">
                                    {altriMarca.map((d) => (
                                      <ArchiveDocRow
                                        key={d.id}
                                        doc={d}
                                        selected={selectedDocId === d.id}
                                        onSelect={() => setSelectedDocId(d.id)}
                                        onEdit={() => setEditDoc(d)}
                                        onDelete={() => handleDelete(d)}
                                        onInfo={() => setInfoDoc(d)}
                                        onToast={setToast}
                                        onApri={() => openDoc(d)}
                                      />
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              <div>
                                <SubTreeHeading title="Modelli e macchine" />
                                <div className="mt-1 space-y-2 pl-0 sm:pl-1">
                                  {modelli.map(({ modello, files, mezzi: mezziNodes }) => {
                                    const mk = `${marca.id}::${modello.id}`;
                                    return (
                                      <div
                                        key={mk}
                                        className="overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => toggleModello(mk)}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--cab-hover)]"
                                          aria-expanded={modelloOpen(marca.id, modello.id)}
                                        >
                                          <span className="w-4 shrink-0 text-center text-xs font-medium text-[color:var(--cab-text-muted)]" aria-hidden>
                                            ·
                                          </span>
                                          <span className="flex-1 text-sm font-medium text-[color:var(--cab-text)]">{modello.nome}</span>
                                          <span className="rounded-full bg-[var(--cab-surface-2)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[color:var(--cab-text-muted)]">
                                            {files.length + mezziNodes.reduce((s, n) => s + n.files.length, 0)}
                                          </span>
                                          <svg
                                            className={`h-4 w-4 shrink-0 text-[color:var(--cab-text-muted)] transition-transform ${modelloOpen(marca.id, modello.id) ? "rotate-180" : ""}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </button>
                                        <div
                                          className={`grid border-t border-[color:var(--cab-border)] transition-[grid-template-rows] duration-200 ${modelloOpen(marca.id, modello.id) ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                                        >
                                          <div className="min-h-0 overflow-hidden">
                                            <div className="space-y-2 bg-[var(--cab-surface-2)]/25 px-2 py-2">
                                              {files.length > 0 ? (
                                                <ul className="space-y-0.5" role="listbox">
                                                  {files.map((d) => (
                                                    <ArchiveDocRow
                                                      key={d.id}
                                                      doc={d}
                                                      selected={selectedDocId === d.id}
                                                      onSelect={() => setSelectedDocId(d.id)}
                                                      onEdit={() => setEditDoc(d)}
                                                      onDelete={() => handleDelete(d)}
                                                      onInfo={() => setInfoDoc(d)}
                                                      onToast={setToast}
                                                      onApri={() => openDoc(d)}
                                                    />
                                                  ))}
                                                </ul>
                                              ) : null}
                                              {mezziNodes.map(({ mezzo, files: mf }) => {
                                                const ek = `${marca.id}::${modello.id}::${mezzo.id}`;
                                                if (mf.length === 0) return null;
                                                return (
                                                  <div
                                                    key={ek}
                                                    className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)]"
                                                  >
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleMezzo(ek)}
                                                      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs font-medium text-[color:var(--cab-text)] transition-colors hover:bg-[var(--cab-hover)]"
                                                      aria-expanded={mezzoOpen(marca.id, modello.id, mezzo.id)}
                                                    >
                                                      <span className="flex-1">
                                                        {mezzo.targa || "—"} · {mezzo.matricola || "—"}
                                                        {mezzo.numeroScuderia ? ` · sc. ${mezzo.numeroScuderia}` : ""}
                                                      </span>
                                                      <span className="tabular-nums text-[color:var(--cab-text-muted)]">{mf.length}</span>
                                                      <svg
                                                        className={`h-3.5 w-3.5 shrink-0 text-[color:var(--cab-text-muted)] ${mezzoOpen(marca.id, modello.id, mezzo.id) ? "rotate-180" : ""}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                      >
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                      </svg>
                                                    </button>
                                                    <div className={`grid px-1 transition-[grid-template-rows] duration-200 ${mezzoOpen(marca.id, modello.id, mezzo.id) ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                                                      <div className="min-h-0 overflow-hidden">
                                                        <ul className="space-y-1.5 px-1 pb-2" role="listbox">
                                                          {mf.map((d) => (
                                                            <ArchiveDocRow
                                                              key={d.id}
                                                              doc={d}
                                                              selected={selectedDocId === d.id}
                                                              onSelect={() => setSelectedDocId(d.id)}
                                                              onEdit={() => setEditDoc(d)}
                                                              onDelete={() => handleDelete(d)}
                                                              onInfo={() => setInfoDoc(d)}
                                                              onToast={setToast}
                                                              onApri={() => openDoc(d)}
                                                            />
                                                          ))}
                                                        </ul>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {documentiSenzaCollocazione.length > 0 ? (
                    <div className="border-t border-[color:color-mix(in_srgb,var(--cab-warning)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-surface))] p-3 sm:p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)]">Senza collocazione</p>
                      <p className="mt-1 text-xs leading-snug text-[color:var(--cab-text-muted)]">
                        Marca, modello o macchina non allineati all&apos;anagrafica. Aggiorna le impostazioni o il documento.
                      </p>
                      <ul className="mt-2 space-y-0.5" role="listbox">
                        {documentiSenzaCollocazione.map((d) => (
                          <ArchiveDocRow
                            key={d.id}
                            doc={d}
                            selected={selectedDocId === d.id}
                            onSelect={() => setSelectedDocId(d.id)}
                            onEdit={() => setEditDoc(d)}
                            onDelete={() => handleDelete(d)}
                            onInfo={() => setInfoDoc(d)}
                            onToast={setToast}
                            onApri={() => openDoc(d)}
                          />
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {showDocPager ? (
              <TablePagination
                page={docPage}
                pageCount={docPageCount}
                onPageChange={setDocPage}
                label={docPagerLabel}
                className="rounded-b-[var(--ds-radius-xl)] border border-t-0 border-[color:var(--cab-border)] bg-[var(--cab-surface-2)]/40"
              />
            ) : null}
          </section>
      </div>

      {uploadOpen ? (
        <UploadDocumentoModal catalog={catalog} mezzi={mezziSnap} onRequestClose={() => setUploadOpen(false)} onSubmit={handleUpload} />
      ) : null}

      {infoDoc ? (
        <DocumentoInfoModal
          doc={infoDoc}
          catalog={catalog}
          onRequestClose={() => setInfoDoc(null)}
          onEdit={() => {
            const d = infoDoc;
            setInfoDoc(null);
            setEditDoc(d);
          }}
        />
      ) : null}

      {editDoc ? (
        <DocumentoEditModal key={editDoc.id} doc={editDoc} catalog={catalog} mezzi={mezziSnap} onRequestClose={() => setEditDoc(null)} onSave={handleSaveEdit} />
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
            aria-label="Log modifiche documenti"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={gestionaleLogPanelHeaderClass}>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log modifiche documenti</h2>
              <button type="button" onClick={() => setLogOpen(false)} className={dsBtnNeutral}>
                Chiudi
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
              <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 flex-1`}>
                {logEntries.length === 0 ? (
                  <GestionaleLogEmpty message="Nessuna modifica registrata." />
                ) : (
                  <GestionaleLogList>
                    {pagedDocLogEntries.map((entry) => (
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
                                if (window.confirm("Rimuovere questa voce dal log?")) removeDocumentiChangeLogEntryById(entry.id);
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
              {showDocLogPager ? (
                <TablePagination page={docLogPage} pageCount={docLogPageCount} onPageChange={setDocLogPage} label={docLogPagerLabel} />
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {toast ? (
        <p
          className="fixed bottom-6 left-1/2 z-[110] max-w-sm -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-center text-xs font-medium text-zinc-700 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          role="status"
          aria-live="polite"
        >
          {toast}
        </p>
      ) : null}
    </>
  );
}
