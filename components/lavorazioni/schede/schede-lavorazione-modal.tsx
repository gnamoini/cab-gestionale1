"use client";

import type { Ref } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { FileEsternoBadge, SchedaStatoBadge } from "@/components/lavorazioni/schede/schede-badges";
import { applyMagazzinoScaricoDaScheda } from "@/lib/magazzino/apply-scarico-da-scheda";
import { getMagazzinoReportSnapshot } from "@/lib/magazzino/magazzino-report-sync";
import {
  formatIdentificazioneMezzoLine,
  identificazionePartsFromLavorazione,
  identificazionePartsFromSchedaIngresso,
} from "@/lib/mezzi/identificazione-mezzo";
import { migrateMezziListePrefs, modelliVisibiliPerMarca } from "@/lib/mezzi/attrezzature-prefs";
import { getMezziListePrefsOrDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { findPreviousLavorazioneStessoMezzo } from "@/lib/schede/schede-duplicate-previous";
import {
  diffSchedaIngressoCampi,
  diffSchedaLavorazioniDoc,
  diffSchedaRicambiDoc,
  SCHEDA_INGRESSO_LABEL,
  SCHEDA_LAVORAZIONI_LABEL,
  SCHEDA_RICAMBI_LABEL,
} from "@/lib/schede/schede-log-helpers";
import {
  buildSchedaIngressoFieldsFromContext,
  buildSchedaLavorazioniFieldsFromContext,
  buildSchedaRicambiFieldsFromContext,
  findMezzoForLavorazione,
} from "@/lib/schede/schede-autofill";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { openBlobInNewTab } from "@/lib/schede/schede-print-html";
import { openSchedaPdfInNewTab } from "@/lib/schede/schede-pdf";
import {
  countSchedePresenti,
  newRigaId,
  newSchedaMeta,
  statoUiSchedaIngresso,
  statoUiSchedaLavorazioni,
  statoUiSchedaRicambi,
} from "@/lib/schede/schede-ui";
import { parseItalianDayToIso } from "@/lib/lavorazioni/date-day-only";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioniLogChange, LavorazioniLogTipo } from "@/lib/lavorazioni/lavorazioni-change-log";
import { buildPreventiviArchivioFilterHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { Q_PREVENTIVI_NUOVO } from "@/lib/preventivi/preventivi-query";
import { loadPreventivi } from "@/lib/preventivi/preventivi-storage";
import { writePendingPreventivoPayload } from "@/lib/preventivi/preventivi-session-bridge";
import { CAB_MEZZI_LISTE_REFRESH, CAB_PREVENTIVI_REFRESH } from "@/lib/sistema/cab-events";
import { dsBadgeOk, dsBtnDanger, dsBtnNeutral, dsBtnPrimary, dsInput, dsScrollbar, dsTable, dsTableHeadCell, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import type {
  LavorazioneSchedeBundle,
  RigaAddettoOreScheda,
  RigaLavorazioneScheda,
  RigaRicambioScheda,
  SchedaIngressoDoc,
  SchedaIngressoFields,
  SchedaLavorazioniDoc,
  SchedaRicambiDoc,
  SchedaTipo,
} from "@/types/schede";

type LavRow = LavorazioneAttiva | LavorazioneArchiviata;

type Stage = { kind: "hub" } | { kind: "ingresso" } | { kind: "lavorazioni" } | { kind: "ricambi" };

function fmtIt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtItShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function todayItDate(): string {
  return new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function assertItalianDay(label: string, value: string): boolean {
  const t = value.trim();
  if (!t) {
    window.alert(`Data obbligatoria: ${label}`);
    return false;
  }
  if (!parseItalianDayToIso(t).ok) {
    window.alert(`${label}: usa il formato GG/MM/AAAA`);
    return false;
  }
  return true;
}

type SchedaLogEv = {
  tipo: LavorazioniLogTipo;
  schedaOggetto: string;
  riepilogo: string;
  changes: LavorazioniLogChange[];
};

export function SchedeLavorazioneModal({
  open,
  onClose,
  lav,
  bundle,
  onPersist,
  attive,
  storico,
  mezzi,
  addetti,
  currentUser,
  schedeStore,
  onSchedaLog,
}: {
  open: boolean;
  onClose: () => void;
  lav: LavRow;
  bundle: LavorazioneSchedeBundle;
  onPersist: (next: LavorazioneSchedeBundle) => void;
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  mezzi: MezzoGestito[];
  addetti: string[];
  currentUser: string;
  schedeStore: Record<string, LavorazioneSchedeBundle>;
  onSchedaLog?: (ev: SchedaLogEv) => void;
}) {
  const router = useRouter();
  const mezzo = useMemo(() => findMezzoForLavorazione(mezzi, lav), [mezzi, lav]);
  const identSubtitle = useMemo(
    () => formatIdentificazioneMezzoLine(identificazionePartsFromLavorazione(lav, mezzo)),
    [lav, mezzo],
  );
  const [stage, setStage] = useState<Stage>({ kind: "hub" });
  const [unsavedPanel, setUnsavedPanel] = useState<null | "ingresso" | "lav" | "ric">(null);
  const [draft, setDraft] = useState<LavorazioneSchedeBundle>(bundle);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [ingressoF, setIngressoF] = useState<SchedaIngressoFields | null>(null);
  const [lavDoc, setLavDoc] = useState<SchedaLavorazioniDoc | null>(null);
  const [ricDoc, setRicDoc] = useState<SchedaRicambiDoc | null>(null);
  const ingressoPrimoCampoRef = useRef<HTMLInputElement | null>(null);
  const baselineIngressoJson = useRef<string | null>(null);
  const baselineLavorazioniJson = useRef<string | null>(null);
  const baselineRicambiJson = useRef<string | null>(null);

  const emitLog = useCallback(
    (ev: SchedaLogEv) => {
      onSchedaLog?.(ev);
    },
    [onSchedaLog],
  );

  const [listeTick, setListeTick] = useState(0);
  useEffect(() => {
    function onL() {
      setListeTick((t) => t + 1);
    }
    window.addEventListener(CAB_MEZZI_LISTE_REFRESH, onL);
    return () => window.removeEventListener(CAB_MEZZI_LISTE_REFRESH, onL);
  }, []);

  const marcheGuidate = useMemo(() => {
    const p = migrateMezziListePrefs(getMezziListePrefsOrDefault());
    const s = new Set<string>(p.marche);
    for (const m of mezzi) {
      const t = m.marca.trim();
      if (t) s.add(t);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "it"));
  }, [mezzi, listeTick]);

  const modelliForMarca = useCallback(
    (marca: string) => {
      const ma = marca.trim();
      const p = migrateMezziListePrefs(getMezziListePrefsOrDefault());
      const fromPrefs = ma ? modelliVisibiliPerMarca(p, ma) : [...p.modelli];
      const set = new Set<string>(fromPrefs);
      for (const m of mezzi) {
        if (m.marca.trim() === ma && m.modello.trim()) set.add(m.modello.trim());
      }
      return [...set].sort((a, b) => a.localeCompare(b, "it"));
    },
    [mezzi, listeTick],
  );

  useEffect(() => {
    if (!open) return;
    setStage({ kind: "hub" });
    setDraft(JSON.parse(JSON.stringify(bundle)) as LavorazioneSchedeBundle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evita reset hub dopo persist (es. «Crea nuova»)
  }, [open, lav.id]);

  const persist = useCallback(
    (b: LavorazioneSchedeBundle) => {
      onPersist(b);
      setDraft(b);
    },
    [onPersist],
  );

  function deleteSchedaTipo(tipo: SchedaTipo) {
    if (!window.confirm("Confermi eliminazione scheda?")) return;
    const base = draftRef.current;
    const label =
      tipo === "ingresso"
        ? SCHEDA_INGRESSO_LABEL
        : tipo === "lavorazioni"
          ? SCHEDA_LAVORAZIONI_LABEL
          : SCHEDA_RICAMBI_LABEL;
    const next: LavorazioneSchedeBundle = { ...base, [tipo]: null };
    persist(next);
    emitLog({ tipo: "eliminazione", schedaOggetto: label, riepilogo: "Scheda eliminata", changes: [] });
    setStage({ kind: "hub" });
    if (tipo === "ingresso") setIngressoF(null);
    if (tipo === "lavorazioni") setLavDoc(null);
    if (tipo === "ricambi") setRicDoc(null);
  }

  function startCreate(tipo: SchedaTipo) {
    const u = currentUser.trim() || "Operatore";
    if (tipo === "ingresso") {
      const campi = buildSchedaIngressoFieldsFromContext(lav, mezzo, addetti[0] ?? "");
      baselineIngressoJson.current = JSON.stringify(campi);
      const doc: SchedaIngressoDoc = { ...newSchedaMeta("ingresso", u), tipo: "ingresso", campi };
      flushSync(() => {
        setIngressoF(campi);
        persist({ ...draftRef.current, ingresso: doc });
        setStage({ kind: "ingresso" });
      });
      emitLog({
        tipo: "creazione",
        schedaOggetto: SCHEDA_INGRESSO_LABEL,
        riepilogo: "Scheda ingresso creata",
        changes: [],
      });
      queueMicrotask(() => ingressoPrimoCampoRef.current?.focus());
    } else if (tipo === "lavorazioni") {
      const campi = buildSchedaLavorazioniFieldsFromContext(lav, mezzo);
      const addInit: RigaAddettoOreScheda[] = [];
      if (lav.addetto.trim()) addInit.push({ addetto: lav.addetto, oreImpiegate: 0 });
      const doc: SchedaLavorazioniDoc = {
        ...newSchedaMeta("lavorazioni", u),
        tipo: "lavorazioni",
        campi: {
          ...campi,
          righe: [
            {
              id: newRigaId(),
              dataLavorazione: todayItDate(),
              lavorazioniEffettuate: "",
              addettiAssegnati: addInit,
            },
          ],
        },
      };
      baselineLavorazioniJson.current = JSON.stringify(doc);
      flushSync(() => {
        setLavDoc(doc);
        persist({ ...draftRef.current, lavorazioni: doc });
        setStage({ kind: "lavorazioni" });
      });
      emitLog({
        tipo: "creazione",
        schedaOggetto: SCHEDA_LAVORAZIONI_LABEL,
        riepilogo: "Scheda lavorazioni creata",
        changes: [],
      });
    } else {
      const campi = buildSchedaRicambiFieldsFromContext(lav, mezzo);
      const doc: SchedaRicambiDoc = {
        ...newSchedaMeta("ricambi", u),
        tipo: "ricambi",
        campi: {
          ...campi,
          righe: [
            {
              id: newRigaId(),
              ricambioId: null,
              ricambioNome: "",
              codice: "",
              quantita: 1,
              addetto: lav.addetto,
              dataUtilizzo: todayItDate(),
            },
          ],
        },
      };
      baselineRicambiJson.current = JSON.stringify(doc);
      flushSync(() => {
        setRicDoc(doc);
        persist({ ...draftRef.current, ricambi: doc });
        setStage({ kind: "ricambi" });
      });
      emitLog({
        tipo: "creazione",
        schedaOggetto: SCHEDA_RICAMBI_LABEL,
        riepilogo: "Scheda ricambi creata",
        changes: [],
      });
    }
  }

  function duplicateIngressoPrev() {
    const prev = findPreviousLavorazioneStessoMezzo(lav, lav.id, attive, storico);
    if (!prev) {
      window.alert("Nessuna lavorazione precedente trovata per lo stesso mezzo (targa / matricola / etichetta).");
      return;
    }
    const bPrev = getOrCreateBundle(schedeStore, prev.id).ingresso;
    if (!bPrev || bPrev.sorgente === "file_esterno") {
      window.alert("La lavorazione precedente non ha una scheda ingresso compilabile da copiare.");
      return;
    }
    const u = currentUser.trim() || "Operatore";
    const now = new Date().toISOString();
    const campi = { ...bPrev.campi };
    baselineIngressoJson.current = JSON.stringify(campi);
    const doc: SchedaIngressoDoc = {
      ...newSchedaMeta("ingresso", u),
      tipo: "ingresso",
      createdAt: now,
      updatedAt: now,
      createdBy: u,
      updatedBy: u,
      sorgente: "generata",
      fileEsterno: null,
      campi,
    };
    setIngressoF(campi);
    persist({ ...draftRef.current, ingresso: doc });
    setStage({ kind: "ingresso" });
    emitLog({
      tipo: "creazione",
      schedaOggetto: SCHEDA_INGRESSO_LABEL,
      riepilogo: "Scheda ingresso creata (copia da intervento precedente)",
      changes: [],
    });
  }

  const lavOrigine = lav.id.startsWith("lav-arch-") ? ("storico" as const) : ("attiva" as const);
  const [pvTick, setPvTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const fn = () => setPvTick((x) => x + 1);
    window.addEventListener(CAB_PREVENTIVI_REFRESH, fn);
    return () => window.removeEventListener(CAB_PREVENTIVI_REFRESH, fn);
  }, [open]);

  const preventiviCollegati = useMemo(() => {
    if (!open || typeof window === "undefined") return [];
    return loadPreventivi().filter((p) => p.lavorazioneId === lav.id);
  }, [lav.id, pvTick, open]);

  function generaPreventivoDaHub() {
    writePendingPreventivoPayload({
      lav,
      origine: lavOrigine,
      bundle: { ...draftRef.current, lavorazioneId: lav.id },
    });
    onClose();
    router.push(`/preventivi?${Q_PREVENTIVI_NUOVO}=1`);
  }

  const hub = draft;
  const nOk = countSchedePresenti(hub);
  const lastUp = useMemo(() => {
    const ts = [hub.ingresso?.updatedAt, hub.lavorazioni?.updatedAt, hub.ricambi?.updatedAt].filter(Boolean) as string[];
    if (!ts.length) return null;
    return ts.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]!;
  }, [hub]);

  function commitIngressoSave(): boolean {
    const ig = ingressoF;
    const base = draftRef.current.ingresso;
    if (!ig || !base) return false;
    if (!assertItalianDay("Data ingresso", ig.dataIngresso)) return false;
    const prevCampi: SchedaIngressoFields | null = baselineIngressoJson.current
      ? (JSON.parse(baselineIngressoJson.current) as SchedaIngressoFields)
      : null;
    const changes = prevCampi ? diffSchedaIngressoCampi(prevCampi, ig) : [];
    if (changes.length) {
      emitLog({
        tipo: "aggiornamento",
        schedaOggetto: SCHEDA_INGRESSO_LABEL,
        riepilogo: "Scheda ingresso aggiornata",
        changes,
      });
    }
    const now = new Date().toISOString();
    const u = currentUser.trim() || "Operatore";
    const nextDoc: SchedaIngressoDoc = {
      tipo: "ingresso",
      createdAt: base.createdAt,
      createdBy: base.createdBy,
      sorgente: base.sorgente,
      fileEsterno: base.fileEsterno,
      campi: ig,
      updatedAt: now,
      updatedBy: u,
    };
    persist({ ...draftRef.current, ingresso: nextDoc });
    return true;
  }

  function tryIngressoBack() {
    const ig = ingressoF;
    if (!ig) {
      setStage({ kind: "hub" });
      return;
    }
    if (baselineIngressoJson.current === JSON.stringify(ig)) {
      setStage({ kind: "hub" });
      setIngressoF(null);
      return;
    }
    setUnsavedPanel("ingresso");
  }

  function commitLavorazioniSave(): boolean {
    const doc = lavDoc;
    if (!doc || !draftRef.current.lavorazioni) return false;
    for (let i = 0; i < doc.campi.righe.length; i += 1) {
      const row = doc.campi.righe[i]!;
      if (!assertItalianDay(`Data riga ${i + 1}`, row.dataLavorazione)) return false;
    }
    const prevDoc: SchedaLavorazioniDoc | null = baselineLavorazioniJson.current
      ? (JSON.parse(baselineLavorazioniJson.current) as SchedaLavorazioniDoc)
      : null;
    const now = new Date().toISOString();
    const u = currentUser.trim() || "Operatore";
    const nextDoc: SchedaLavorazioniDoc = {
      tipo: "lavorazioni",
      createdAt: doc.createdAt,
      createdBy: doc.createdBy,
      sorgente: doc.sorgente,
      fileEsterno: doc.fileEsterno,
      campi: { ...doc.campi, righe: doc.campi.righe.map((r) => ({ ...r })) },
      updatedAt: now,
      updatedBy: u,
    };
    const changes = diffSchedaLavorazioniDoc(prevDoc, nextDoc);
    if (changes.length) {
      emitLog({
        tipo: "aggiornamento",
        schedaOggetto: SCHEDA_LAVORAZIONI_LABEL,
        riepilogo: "Scheda lavorazioni aggiornata",
        changes,
      });
    }
    persist({ ...draftRef.current, lavorazioni: nextDoc });
    return true;
  }

  function tryLavorazioniBack() {
    const doc = lavDoc;
    if (!doc) {
      setStage({ kind: "hub" });
      return;
    }
    if (baselineLavorazioniJson.current === JSON.stringify(doc)) {
      setStage({ kind: "hub" });
      setLavDoc(null);
      return;
    }
    setUnsavedPanel("lav");
  }

  function commitRicambiSave(): boolean {
    const doc = ricDoc;
    if (!doc || !draftRef.current.ricambi) return false;
    for (let i = 0; i < doc.campi.righe.length; i += 1) {
      const row = doc.campi.righe[i]!;
      if (!assertItalianDay(`Data utilizzo riga ${i + 1}`, row.dataUtilizzo)) return false;
    }
    const prevDoc: SchedaRicambiDoc | null = baselineRicambiJson.current
      ? (JSON.parse(baselineRicambiJson.current) as SchedaRicambiDoc)
      : null;
    const now = new Date().toISOString();
    const u = currentUser.trim() || "Operatore";
    const nextDoc: SchedaRicambiDoc = {
      tipo: "ricambi",
      createdAt: doc.createdAt,
      createdBy: doc.createdBy,
      sorgente: doc.sorgente,
      fileEsterno: doc.fileEsterno,
      campi: { ...doc.campi, righe: doc.campi.righe.map((r) => ({ ...r })) },
      updatedAt: now,
      updatedBy: u,
    };
    const changes = diffSchedaRicambiDoc(prevDoc, nextDoc);
    if (changes.length) {
      emitLog({
        tipo: "aggiornamento",
        schedaOggetto: SCHEDA_RICAMBI_LABEL,
        riepilogo: "Scheda ricambi aggiornata",
        changes,
      });
    }
    persist({ ...draftRef.current, ricambi: nextDoc });
    return true;
  }

  function tryRicambiBack() {
    const doc = ricDoc;
    if (!doc) {
      setStage({ kind: "hub" });
      return;
    }
    if (baselineRicambiJson.current === JSON.stringify(doc)) {
      setStage({ kind: "hub" });
      setRicDoc(null);
      return;
    }
    setUnsavedPanel("ric");
  }

  if (!open) return null;

  function apriSchedaIngresso() {
    if (!hub.ingresso) return;
    if (hub.ingresso.sorgente === "file_esterno" && hub.ingresso.fileEsterno) {
      openBlobInNewTab(hub.ingresso.fileEsterno.mime, hub.ingresso.fileEsterno.dataBase64, hub.ingresso.fileEsterno.fileName);
      return;
    }
    baselineIngressoJson.current = JSON.stringify(hub.ingresso.campi);
    setIngressoF(hub.ingresso.campi);
    setStage({ kind: "ingresso" });
  }
  function apriSchedaLavorazioni() {
    if (!hub.lavorazioni) return;
    if (hub.lavorazioni.sorgente === "file_esterno" && hub.lavorazioni.fileEsterno) {
      openBlobInNewTab(hub.lavorazioni.fileEsterno.mime, hub.lavorazioni.fileEsterno.dataBase64, hub.lavorazioni.fileEsterno.fileName);
      return;
    }
    baselineLavorazioniJson.current = JSON.stringify(hub.lavorazioni);
    setLavDoc(hub.lavorazioni);
    setStage({ kind: "lavorazioni" });
  }
  function apriSchedaRicambi() {
    if (!hub.ricambi) return;
    if (hub.ricambi.sorgente === "file_esterno" && hub.ricambi.fileEsterno) {
      openBlobInNewTab(hub.ricambi.fileEsterno.mime, hub.ricambi.fileEsterno.dataBase64, hub.ricambi.fileEsterno.fileName);
      return;
    }
    baselineRicambiJson.current = JSON.stringify(hub.ricambi);
    setRicDoc(hub.ricambi);
    setStage({ kind: "ricambi" });
  }

  return (
    <>
      <LavorazioniModalShell wide maxWidthClass="max-w-4xl" onRequestClose={onClose}>
        <div className="relative flex min-h-0 max-h-[min(92dvh,920px)] flex-1 flex-col">
        <div className="flex shrink-0 flex-col gap-1 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Schede lavorazione</h2>
          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{identSubtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
            <span className="rounded-full bg-orange-500/10 px-2 py-0.5 font-semibold text-orange-800 dark:text-orange-200">
              Schede {nOk}/3
            </span>
            {lastUp ? (
              <span>
                Ultimo aggiornamento: <span className="font-medium text-zinc-800 dark:text-zinc-100">{fmtIt(lastUp)}</span>
              </span>
            ) : (
              <span>Nessuna scheda ancora registrata</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-300">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              Preventivi collegati: {preventiviCollegati.length}
            </span>
            <Link
              href={buildPreventiviArchivioFilterHref(lav.id, lavOrigine)}
              className="font-semibold text-orange-700 underline-offset-2 hover:underline dark:text-orange-300"
            >
              Apri archivio preventivi
            </Link>
          </div>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-3 gestionale-scrollbar`}>
          {stage.kind === "hub" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" className={dsBtnNeutral} onClick={duplicateIngressoPrev}>
                  Copia ingresso da intervento precedente (stesso mezzo)
                </button>
              </div>
              <SchedaSectionHub
                title="Scheda ingresso"
                stato={statoUiSchedaIngresso(hub)}
                doc={hub.ingresso}
                onApri={apriSchedaIngresso}
                onCrea={() => startCreate("ingresso")}
                onPdf={() => {
                  if (!hub.ingresso) return;
                  openSchedaPdfInNewTab({
                    titoloScheda: "Scheda ingresso",
                    identificazioneLine: formatIdentificazioneMezzoLine(
                      identificazionePartsFromSchedaIngresso(hub.ingresso.campi),
                    ),
                    bundle: hub,
                    doc: hub.ingresso,
                    autore: currentUser,
                  });
                }}
                onElimina={hub.ingresso ? () => deleteSchedaTipo("ingresso") : undefined}
              />
              <SchedaSectionHub
                title="Scheda lavorazioni"
                stato={statoUiSchedaLavorazioni(hub)}
                doc={hub.lavorazioni}
                onApri={apriSchedaLavorazioni}
                onCrea={() => startCreate("lavorazioni")}
                onPdf={() => {
                  if (!hub.lavorazioni) return;
                  openSchedaPdfInNewTab({
                    titoloScheda: "Scheda lavorazioni",
                    identificazioneLine: identSubtitle,
                    bundle: hub,
                    doc: hub.lavorazioni,
                    autore: currentUser,
                  });
                }}
                onElimina={hub.lavorazioni ? () => deleteSchedaTipo("lavorazioni") : undefined}
              />
              <SchedaSectionHub
                title="Scheda ricambi utilizzati"
                stato={statoUiSchedaRicambi(hub)}
                doc={hub.ricambi}
                onApri={apriSchedaRicambi}
                onCrea={() => startCreate("ricambi")}
                onPdf={() => {
                  if (!hub.ricambi) return;
                  openSchedaPdfInNewTab({
                    titoloScheda: "Scheda ricambi utilizzati",
                    identificazioneLine: identSubtitle,
                    bundle: hub,
                    doc: hub.ricambi,
                    autore: currentUser,
                  });
                }}
                onElimina={hub.ricambi ? () => deleteSchedaTipo("ricambi") : undefined}
              />
              <div className="flex justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button type="button" className={dsBtnPrimary} onClick={generaPreventivoDaHub}>
                  Genera preventivo
                </button>
              </div>
            </div>
          ) : null}

          {stage.kind === "ingresso" && hub.ingresso && ingressoF ? (
            <IngressoPanel
              doc={hub.ingresso}
              fields={ingressoF}
              setFields={setIngressoF}
              marcheGuidate={marcheGuidate}
              modelliForMarca={modelliForMarca}
              addettiLista={addetti}
              dataIngressoInputRef={ingressoPrimoCampoRef}
              onBack={tryIngressoBack}
              onDelete={() => deleteSchedaTipo("ingresso")}
              onSave={() => {
                if (!commitIngressoSave()) return;
                setStage({ kind: "hub" });
                setIngressoF(null);
              }}
            />
          ) : null}

          {stage.kind === "lavorazioni" && hub.lavorazioni && lavDoc ? (
            <LavorazioniPanel
              doc={lavDoc}
              setDoc={setLavDoc}
              addettiLista={addetti}
              onBack={tryLavorazioniBack}
              onDelete={() => deleteSchedaTipo("lavorazioni")}
              onSave={() => {
                if (!commitLavorazioniSave()) return;
                setStage({ kind: "hub" });
                setLavDoc(null);
              }}
            />
          ) : null}

          {stage.kind === "ricambi" && hub.ricambi && ricDoc ? (
            <RicambiPanel
              doc={ricDoc}
              setDoc={setRicDoc}
              lav={lav}
              identLine={identSubtitle}
              currentUser={currentUser}
              addettiLista={addetti}
              onBack={tryRicambiBack}
              onDelete={() => deleteSchedaTipo("ricambi")}
              onImmediatePersist={(d) => persist({ ...draftRef.current, ricambi: d })}
              onSave={() => {
                if (!commitRicambiSave()) return;
                setStage({ kind: "hub" });
                setRicDoc(null);
              }}
            />
          ) : null}
        </div>

        {unsavedPanel ? (
          <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Modifiche non salvate</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Hai modifiche non salvate. Vuoi uscire senza salvare?
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <button type="button" className={dsBtnNeutral} onClick={() => setUnsavedPanel(null)}>
                  Resta
                </button>
                <button
                  type="button"
                  className={dsBtnDanger}
                  onClick={() => {
                    const p = unsavedPanel;
                    setUnsavedPanel(null);
                    setStage({ kind: "hub" });
                    if (p === "ingresso") setIngressoF(null);
                    if (p === "lav") setLavDoc(null);
                    if (p === "ric") setRicDoc(null);
                  }}
                >
                  Esci senza salvare
                </button>
                <button
                  type="button"
                  className={dsBtnPrimary}
                  onClick={() => {
                    const p = unsavedPanel;
                    if (p === "ingresso") {
                      if (!commitIngressoSave()) return;
                      setIngressoF(null);
                    } else if (p === "lav") {
                      if (!commitLavorazioniSave()) return;
                      setLavDoc(null);
                    } else if (p === "ric") {
                      if (!commitRicambiSave()) return;
                      setRicDoc(null);
                    }
                    setUnsavedPanel(null);
                    setStage({ kind: "hub" });
                  }}
                >
                  Salva ed esci
                </button>
              </div>
            </div>
          </div>
        ) : null}
        </div>
      </LavorazioniModalShell>
    </>
  );
}

function SchedaSectionHub({
  title,
  stato,
  doc,
  onApri,
  onCrea,
  onPdf,
  onElimina,
}: {
  title: string;
  stato: ReturnType<typeof statoUiSchedaIngresso>;
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc | null;
  onApri: () => void;
  onCrea: () => void;
  onPdf: () => void;
  onElimina?: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SchedaStatoBadge stato={stato} />
            {doc?.sorgente === "file_esterno" ? <FileEsternoBadge /> : null}
            {doc ? (
              <span className="text-[10px] text-zinc-500">
                Agg. {fmtItShort(doc.updatedAt)} · {doc.updatedBy}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex w-[8.75rem] shrink-0 justify-stretch">
            {!doc ? (
              <button type="button" className={`${dsBtnPrimary} w-full min-w-0`} onClick={onCrea}>
                Crea nuova
              </button>
            ) : onElimina ? (
              <button type="button" className={`${dsBtnDanger} w-full min-w-0`} onClick={onElimina}>
                Elimina
              </button>
            ) : null}
          </div>
          <button type="button" className={dsBtnNeutral} disabled={!doc} onClick={onApri}>
            Apri scheda
          </button>
          <button type="button" className={dsBtnNeutral} disabled={!doc} onClick={onPdf}>
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function AutoGrowTextarea({
  value,
  onChange,
  readOnly,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const ta = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(72, el.scrollHeight)}px`;
  }, [value, readOnly]);
  return (
    <textarea
      ref={ta}
      rows={2}
      className={className}
      readOnly={readOnly}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ overflow: "hidden", minHeight: "4.5rem", resize: "none" }}
    />
  );
}

function SchedaDayField({
  label,
  value,
  onChange,
  readOnly,
  inputRef,
  showLabel = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  showLabel?: boolean;
}) {
  if (readOnly) {
    return (
      <label className="block text-xs">
        {showLabel ? <span className="text-zinc-500">{label}</span> : null}
        <input className={`${dsInput} mt-1`} readOnly value={value} />
      </label>
    );
  }
  return (
    <label className="block text-xs">
      {showLabel ? <span className="text-zinc-500">{label}</span> : null}
      <div className={`flex flex-wrap items-stretch gap-2 ${showLabel ? "mt-1" : ""}`}>
        <div className="min-w-[11rem] flex-1">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="GG/MM/AAAA"
            className={`${dsInput}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <button type="button" className={`${dsBtnNeutral} shrink-0 self-end`} onClick={() => onChange(todayItDate())}>
          Oggi
        </button>
      </div>
    </label>
  );
}

function IngressoPanel({
  doc,
  fields,
  setFields,
  marcheGuidate,
  modelliForMarca,
  addettiLista,
  dataIngressoInputRef,
  onBack,
  onDelete,
  onSave,
}: {
  doc: SchedaIngressoDoc;
  fields: SchedaIngressoFields;
  setFields: (f: SchedaIngressoFields) => void;
  marcheGuidate: string[];
  modelliForMarca: (marca: string) => string[];
  addettiLista: string[];
  dataIngressoInputRef?: Ref<HTMLInputElement>;
  onBack: () => void;
  onDelete: () => void;
  onSave: () => void;
}) {
  const ro = doc.sorgente === "file_esterno";
  const grid = "grid gap-3 sm:grid-cols-2";
  const modelliOpts = modelliForMarca(fields.marcaAttrezzatura);
  const inp = (k: keyof SchedaIngressoFields, label: string) => (
    <label className="block text-xs" key={String(k)}>
      <span className="text-zinc-500">{label}</span>
      <input
        className={`${dsInput} mt-1`}
        readOnly={ro}
        value={fields[k]}
        onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
      />
    </label>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={dsBtnNeutral} onClick={onBack}>
          ← Indietro
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {doc.sorgente !== "file_esterno" ? (
            <button type="button" className={dsBtnDanger} onClick={onDelete}>
              Elimina scheda
            </button>
          ) : null}
          {!ro ? (
            <button type="button" className={dsBtnPrimary} onClick={onSave}>
              Salva scheda
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-zinc-500">Autore ultima modifica: {doc.updatedBy}</p>
      <div className={grid}>
        <SchedaDayField
          label="Data ingresso *"
          value={fields.dataIngresso}
          onChange={(v) => setFields({ ...fields, dataIngresso: v })}
          readOnly={ro}
          inputRef={dataIngressoInputRef}
        />
        {inp("cliente", "Cliente")}
        {inp("cantiere", "Cantiere")}
        {inp("utilizzatore", "Utilizzatore")}
        {inp("tipoAttrezzatura", "Tipo attrezzatura")}
        <label className="block text-xs">
          <span className="text-zinc-500">Marca attrezzatura</span>
          {ro ? (
            <input className={`${dsInput} mt-1`} readOnly value={fields.marcaAttrezzatura} />
          ) : (
            <>
              <input
                className={`${dsInput} mt-1`}
                list="scheda-ingresso-marche"
                value={fields.marcaAttrezzatura}
                onChange={(e) =>
                  setFields({
                    ...fields,
                    marcaAttrezzatura: e.target.value,
                    modelloAttrezzatura: "",
                  })
                }
              />
              <datalist id="scheda-ingresso-marche">
                {marcheGuidate.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </>
          )}
        </label>
        <label className="block text-xs">
          <span className="text-zinc-500">Modello attrezzatura</span>
          {ro ? (
            <input className={`${dsInput} mt-1`} readOnly value={fields.modelloAttrezzatura} />
          ) : (
            <>
              <input
                className={`${dsInput} mt-1`}
                list="scheda-ingresso-modelli"
                value={fields.modelloAttrezzatura}
                onChange={(e) => setFields({ ...fields, modelloAttrezzatura: e.target.value })}
              />
              <datalist id="scheda-ingresso-modelli">
                {modelliOpts.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </>
          )}
        </label>
        {inp("matricola", "Matricola")}
        {inp("nScuderia", "N. scuderia")}
        {inp("oreLavoro", "Ore lavoro")}
        {inp("tipoTelaio", "Tipo telaio")}
        {inp("marcaTelaio", "Marca telaio")}
        {inp("modelloTelaio", "Modello telaio")}
        {inp("targa", "Targa")}
        {inp("km", "KM")}
        {inp("livelloCarburante", "Livello carburante")}
        <label className="block text-xs">
          <span className="text-zinc-500">Addetto accettazione</span>
          {ro ? (
            <input className={`${dsInput} mt-1`} readOnly value={fields.addettoAccettazione} />
          ) : (
            <>
              <input
                className={`${dsInput} mt-1`}
                list="scheda-ingresso-addetti"
                value={fields.addettoAccettazione}
                onChange={(e) => setFields({ ...fields, addettoAccettazione: e.target.value })}
              />
              <datalist id="scheda-ingresso-addetti">
                {addettiLista.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </>
          )}
        </label>
      </div>
      <label className="block text-xs">
        <span className="text-zinc-500">Descrizione anomalia</span>
        <textarea
          className={`${dsInput} mt-1 min-h-[6rem]`}
          readOnly={ro}
          value={fields.descrizioneAnomalia}
          onChange={(e) => setFields({ ...fields, descrizioneAnomalia: e.target.value })}
        />
      </label>
    </div>
  );
}

function LavorazioniPanel({
  doc,
  setDoc,
  addettiLista,
  onBack,
  onDelete,
  onSave,
}: {
  doc: SchedaLavorazioniDoc;
  setDoc: (d: SchedaLavorazioniDoc) => void;
  addettiLista: string[];
  onBack: () => void;
  onDelete: () => void;
  onSave: () => void;
}) {
  const ro = doc.sorgente === "file_esterno";
  function patchRighe(righe: RigaLavorazioneScheda[]) {
    setDoc({ ...doc, campi: { ...doc.campi, righe } });
  }
  function patchRiga(rid: string, fn: (r: RigaLavorazioneScheda) => RigaLavorazioneScheda) {
    patchRighe(doc.campi.righe.map((x) => (x.id === rid ? fn(x) : x)));
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" className={dsBtnNeutral} onClick={onBack}>
          ← Indietro
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {doc.sorgente !== "file_esterno" ? (
            <button type="button" className={dsBtnDanger} onClick={onDelete}>
              Elimina scheda
            </button>
          ) : null}
          {!ro ? (
            <button type="button" className={dsBtnPrimary} onClick={onSave}>
              Salva scheda
            </button>
          ) : null}
        </div>
      </div>
      <label className="block text-xs">
        <span className="text-zinc-500">Identificazione macchina</span>
        <input
          className={`${dsInput} mt-1`}
          readOnly={ro}
          value={doc.campi.identificazioneMacchina}
          onChange={(e) => setDoc({ ...doc, campi: { ...doc.campi, identificazioneMacchina: e.target.value } })}
        />
      </label>
      <div className={`${dsTableWrap} ${dsScrollbar}`}>
        <table className={`${dsTable} text-xs`}>
          <thead>
            <tr>
              <th className={dsTableHeadCell}>Data</th>
              <th className={`${dsTableHeadCell} min-w-[min(100%,28rem)] w-full`}>Lavorazioni effettuate</th>
              <th className={`${dsTableHeadCell} min-w-[12rem]`}>Addetti (ore)</th>
              {!ro ? <th className={`${dsTableHeadCell} w-24`} /> : null}
            </tr>
          </thead>
          <tbody>
            {doc.campi.righe.map((r) => (
              <tr key={r.id} className={dsTableRow}>
                <td className="px-2 py-2 align-top">
                  {ro ? (
                    <span className="text-zinc-800 dark:text-zinc-100">{r.dataLavorazione}</span>
                  ) : (
                    <SchedaDayField
                      label="Data"
                      showLabel={false}
                      value={r.dataLavorazione}
                      onChange={(v) => patchRiga(r.id, (row) => ({ ...row, dataLavorazione: v }))}
                    />
                  )}
                </td>
                <td className="px-2 py-2 align-top">
                  <AutoGrowTextarea
                    className={`${dsInput} !py-2 !text-sm w-full max-w-none leading-relaxed`}
                    readOnly={ro}
                    value={r.lavorazioniEffettuate}
                    onChange={(v) => patchRiga(r.id, (row) => ({ ...row, lavorazioniEffettuate: v }))}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  {ro ? (
                    <div className="space-y-0.5 text-zinc-800 dark:text-zinc-100">
                      {(r.addettiAssegnati ?? []).length ? (
                        r.addettiAssegnati!.map((a, i) => (
                          <div key={i}>
                            {a.addetto || "—"} — {a.oreImpiegate}h
                          </div>
                        ))
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(r.addettiAssegnati ?? []).map((a, idx) => (
                        <div key={`${r.id}-a-${idx}`} className="flex flex-wrap items-end gap-1">
                          <div className="min-w-[9rem] flex-1">
                            <select
                              className={`${dsInput} !py-1.5 !text-xs`}
                              value={a.addetto}
                              onChange={(e) => {
                                const next = [...(r.addettiAssegnati ?? [])];
                                next[idx] = { ...next[idx]!, addetto: e.target.value };
                                patchRiga(r.id, (row) => ({ ...row, addettiAssegnati: next }));
                              }}
                            >
                              <option value="">Seleziona addetto…</option>
                              {addettiLista.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className={`${dsInput} !py-1.5 !text-xs w-20`}
                            value={Number.isFinite(a.oreImpiegate) ? Math.round(a.oreImpiegate) : 0}
                            onChange={(e) => {
                              const v = Math.max(0, Math.round(Number.parseFloat(e.target.value) || 0));
                              const next = [...(r.addettiAssegnati ?? [])];
                              next[idx] = { ...next[idx]!, oreImpiegate: v };
                              patchRiga(r.id, (row) => ({ ...row, addettiAssegnati: next }));
                            }}
                          />
                          <button
                            type="button"
                            className="shrink-0 rounded p-1 text-sm text-zinc-400 transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                            title="Rimuovi addetto"
                            aria-label="Rimuovi addetto"
                            onClick={() => {
                              if (!window.confirm("Rimuovere questo addetto dalla riga?")) return;
                              const next = (r.addettiAssegnati ?? []).filter((_, j) => j !== idx);
                              patchRiga(r.id, (row) => ({ ...row, addettiAssegnati: next }));
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={`${dsBtnNeutral} text-[10px] px-2 py-1`}
                        onClick={() =>
                          patchRiga(r.id, (row) => ({
                            ...row,
                            addettiAssegnati: [...(row.addettiAssegnati ?? []), { addetto: "", oreImpiegate: 0 }],
                          }))
                        }
                      >
                        + Aggiungi addetto
                      </button>
                    </div>
                  )}
                </td>
                {!ro ? (
                  <td className="px-2 py-2 align-top">
                    <button
                      type="button"
                      className="rounded p-1.5 text-sm text-zinc-400 transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                      title="Rimuovi riga"
                      aria-label="Rimuovi riga lavorazione"
                      onClick={() => {
                        if (!window.confirm("Eliminare questa riga?")) return;
                        patchRighe(doc.campi.righe.filter((x) => x.id !== r.id));
                      }}
                    >
                      ✕
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!ro ? (
        <button
          type="button"
          className={dsBtnNeutral}
          onClick={() =>
            patchRighe([
              ...doc.campi.righe,
              {
                id: newRigaId(),
                dataLavorazione: todayItDate(),
                lavorazioniEffettuate: "",
                addettiAssegnati: [],
              },
            ])
          }
        >
          + Aggiungi riga lavorazione
        </button>
      ) : null}
    </div>
  );
}

function RicambiPanel({
  doc,
  setDoc,
  lav,
  identLine,
  currentUser,
  addettiLista,
  onBack,
  onSave,
  onImmediatePersist,
  onDelete,
}: {
  doc: SchedaRicambiDoc;
  setDoc: (d: SchedaRicambiDoc) => void;
  lav: LavRow;
  identLine: string;
  currentUser: string;
  addettiLista: string[];
  onBack: () => void;
  onSave: () => void;
  onImmediatePersist: (d: SchedaRicambiDoc) => void;
  onDelete: () => void;
}) {
  const ro = doc.sorgente === "file_esterno";
  const prodotti = getMagazzinoReportSnapshot();
  const [acRowId, setAcRowId] = useState<string | null>(null);

  useEffect(() => {
    if (!acRowId) return;
    function onDoc(ev: MouseEvent) {
      const t = ev.target;
      if (t instanceof Element && t.closest("tr[data-ricambi-ac-open='1']")) return;
      setAcRowId(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [acRowId]);

  function patchRighe(righe: RigaRicambioScheda[]) {
    setDoc({ ...doc, campi: { ...doc.campi, righe } });
  }

  function suggestionsForRow(r: RigaRicambioScheda) {
    const q = `${r.ricambioNome} ${r.codice}`.trim().toLowerCase();
    if (q.length < 1) return [];
    return prodotti
      .filter((p) => {
        const d = (p.descrizione ?? "").toLowerCase();
        const c = (p.codiceFornitoreOriginale ?? "").toLowerCase();
        const m = (p.marca ?? "").toLowerCase();
        return d.includes(q) || c.includes(q) || m.includes(q) || q.split(/\s+/).every((w) => w && (d.includes(w) || c.includes(w) || m.includes(w)));
      })
      .slice(0, 12);
  }

  function applyRowMagazzino(r: RigaRicambioScheda) {
    if (!r.ricambioId) {
      window.alert("Seleziona un ricambio dall'anagrafica magazzino o dai suggerimenti.");
      return;
    }
    if (r.scaricoMagazzinoApplicato) {
      window.alert("Scarico già effettuato per questa riga.");
      return;
    }
    const ok = window.confirm(`Confermare scarico magazzino di ${r.quantita} pz. per ${r.ricambioNome}?`);
    if (!ok) return;
    const res = applyMagazzinoScaricoDaScheda({
      ricambioId: r.ricambioId,
      quantita: r.quantita,
      autore: currentUser,
      riepilogo: `Scheda ricambi · ${identLine}`,
    });
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    const righe = doc.campi.righe.map((x) => (x.id === r.id ? { ...x, scaricoMagazzinoApplicato: true } : x));
    const now = new Date().toISOString();
    const u = currentUser.trim() || "Operatore";
    const nextDoc: SchedaRicambiDoc = {
      ...doc,
      campi: { ...doc.campi, righe },
      updatedAt: now,
      updatedBy: u,
    };
    setDoc(nextDoc);
    onImmediatePersist(nextDoc);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" className={dsBtnNeutral} onClick={onBack}>
          ← Indietro
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {doc.sorgente !== "file_esterno" ? (
            <button type="button" className={dsBtnDanger} onClick={onDelete}>
              Elimina scheda
            </button>
          ) : null}
          {!ro ? (
            <button type="button" className={dsBtnPrimary} onClick={onSave}>
              Salva scheda
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Identificazione:{" "}
        <span className="font-medium text-zinc-800 dark:text-zinc-100">{identLine}</span>
      </p>
      <div className={`${dsTableWrap} ${dsScrollbar}`}>
        <table className={`${dsTable} text-xs`}>
          <thead>
            <tr>
              <th className={`${dsTableHeadCell} min-w-[10rem]`}>Ricambio</th>
              <th className={dsTableHeadCell}>Codice</th>
              <th className={dsTableHeadCell}>Qtà</th>
              <th className={dsTableHeadCell}>Addetto</th>
              <th className={dsTableHeadCell}>Data</th>
              {!ro ? <th className={dsTableHeadCell}>Magazzino</th> : null}
              {!ro ? <th className={`${dsTableHeadCell} w-24`} /> : null}
            </tr>
          </thead>
          <tbody>
            {doc.campi.righe.map((r) => {
              const sug = !ro && acRowId === r.id ? suggestionsForRow(r) : [];
              return (
                <tr key={r.id} className={dsTableRow} data-ricambi-ac-open={acRowId === r.id ? "1" : undefined}>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <span>{r.ricambioNome || "—"}</span>
                    ) : (
                      <div className="relative">
                        <input
                          className={`${dsInput} !py-1.5 !text-xs`}
                          value={r.ricambioNome}
                          onChange={(e) => {
                            const v = e.target.value;
                            patchRighe(doc.campi.righe.map((x) => (x.id === r.id ? { ...x, ricambioNome: v } : x)));
                            setAcRowId(r.id);
                          }}
                          onFocus={() => setAcRowId(r.id)}
                          placeholder="Nome / descrizione"
                        />
                        {sug.length > 0 ? (
                          <ul className="absolute left-0 top-full z-[80] mt-0.5 max-h-48 min-w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 text-[11px] shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
                            {sug.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  className="flex w-full flex-col px-2 py-1.5 text-left hover:bg-orange-50 dark:hover:bg-zinc-800"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    patchRighe(
                                      doc.campi.righe.map((x) =>
                                        x.id === r.id
                                          ? {
                                              ...x,
                                              ricambioId: p.id,
                                              ricambioNome: p.descrizione ?? "",
                                              codice: p.codiceFornitoreOriginale ?? "",
                                            }
                                          : x,
                                      ),
                                    );
                                    setAcRowId(null);
                                  }}
                                >
                                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{p.descrizione}</span>
                                  <span className="text-zinc-500">
                                    {p.marca} · {p.codiceFornitoreOriginale}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      className={`${dsInput} !py-1.5 !text-xs`}
                      readOnly={ro}
                      value={r.codice}
                      onChange={(e) => {
                        const v = e.target.value;
                        patchRighe(doc.campi.righe.map((x) => (x.id === r.id ? { ...x, codice: v } : x)));
                        if (!ro) setAcRowId(r.id);
                      }}
                      onFocus={() => !ro && setAcRowId(r.id)}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="number"
                      min={1}
                      className={`${dsInput} !py-1.5 !text-xs w-20`}
                      readOnly={ro}
                      value={r.quantita}
                      onChange={(e) =>
                        patchRighe(
                          doc.campi.righe.map((x) =>
                            x.id === r.id ? { ...x, quantita: Math.max(1, Math.round(Number(e.target.value) || 1)) } : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <span>{r.addetto}</span>
                    ) : (
                      <>
                        <input
                          className={`${dsInput} !py-1.5 !text-xs`}
                          list={`ric-addetti-${r.id}`}
                          value={r.addetto}
                          onChange={(e) => patchRighe(doc.campi.righe.map((x) => (x.id === r.id ? { ...x, addetto: e.target.value } : x)))}
                        />
                        <datalist id={`ric-addetti-${r.id}`}>
                          {addettiLista.map((a) => (
                            <option key={a} value={a} />
                          ))}
                        </datalist>
                      </>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {ro ? (
                      <span>{r.dataUtilizzo}</span>
                    ) : (
                      <SchedaDayField
                        label="Data"
                        showLabel={false}
                        value={r.dataUtilizzo}
                        onChange={(v) => patchRighe(doc.campi.righe.map((x) => (x.id === r.id ? { ...x, dataUtilizzo: v } : x)))}
                      />
                    )}
                  </td>
                  {!ro ? (
                    <td className="px-2 py-2 align-top">
                      <div className="flex flex-col items-start gap-1.5">
                        <button
                          type="button"
                          className={dsBtnNeutral}
                          disabled={!r.ricambioId || Boolean(r.scaricoMagazzinoApplicato)}
                          onClick={() => applyRowMagazzino(r)}
                        >
                          Scarica
                        </button>
                        {r.scaricoMagazzinoApplicato ? <span className={dsBadgeOk}>Scaricato</span> : null}
                      </div>
                    </td>
                  ) : null}
                  {!ro ? (
                    <td className="px-2 py-2 align-top">
                      <button
                        type="button"
                        className="rounded p-1.5 text-sm text-zinc-400 transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                        title="Rimuovi riga"
                        aria-label="Rimuovi riga ricambio"
                        onClick={() => {
                          if (!window.confirm("Eliminare questa riga?")) return;
                          patchRighe(doc.campi.righe.filter((x) => x.id !== r.id));
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!ro ? (
        <button
          type="button"
          className={dsBtnNeutral}
          onClick={() =>
            patchRighe([
              ...doc.campi.righe,
              {
                id: newRigaId(),
                ricambioId: null,
                ricambioNome: "",
                codice: "",
                quantita: 1,
                addetto: lav.addetto,
                dataUtilizzo: todayItDate(),
              },
            ])
          }
        >
          + Aggiungi riga ricambio
        </button>
      ) : null}
    </div>
  );
}
