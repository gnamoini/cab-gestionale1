"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { calcolaTotaliPreventivo, totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";
import { openPreventivoPdfInNewTab } from "@/lib/preventivi/preventivi-pdf";
import { appendPreventiviChangeLog } from "@/lib/preventivi/preventivi-change-log-storage";
import { appendPreventivo, upsertPreventivo } from "@/lib/preventivi/preventivi-storage";
import { maybeRecordLearningOnSave } from "@/lib/preventivi/trasforma-descrizione";
import type { PreventivoRecord, PreventivoRigaRicambio } from "@/lib/preventivi/types";
import { dsBtnDanger, dsBtnNeutral, dsBtnPrimary, dsInput, dsScrollbar, dsTable, dsTableHeadCell, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";
import { migrateMezziListePrefs, modelliVisibiliPerMarca } from "@/lib/mezzi/attrezzature-prefs";
import { getMezziListePrefsOrDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { CAB_MEZZI_LISTE_REFRESH } from "@/lib/sistema/cab-events";

function cloneRecord(p: PreventivoRecord): PreventivoRecord {
  return JSON.parse(JSON.stringify(p)) as PreventivoRecord;
}

function fmtEuro(n: number): string {
  return `${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function fmtDayIt(iso: string): string {
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

export function PreventiviEditorModal({
  open,
  record,
  isNew,
  autore,
  onClose,
  onSaved,
}: {
  open: boolean;
  record: PreventivoRecord | null;
  isNew: boolean;
  autore: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const baselineRef = useRef<PreventivoRecord | null>(null);
  const draftRef = useRef<PreventivoRecord | null>(null);
  const [draft, setDraft] = useState<PreventivoRecord | null>(null);
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);

  useEffect(() => {
    if (!open || !record) {
      setDraft(null);
      baselineRef.current = null;
      draftRef.current = null;
      setUnsavedExitOpen(false);
      return;
    }
    const c = cloneRecord(record);
    baselineRef.current = cloneRecord(record);
    draftRef.current = c;
    setDraft(c);
  }, [open, record]);

  useLayoutEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const [listeTick, setListeTick] = useState(0);
  useEffect(() => {
    function onL() {
      setListeTick((t) => t + 1);
    }
    window.addEventListener(CAB_MEZZI_LISTE_REFRESH, onL);
    return () => window.removeEventListener(CAB_MEZZI_LISTE_REFRESH, onL);
  }, []);

  const prefsAtt = useMemo(() => migrateMezziListePrefs(getMezziListePrefsOrDefault()), [listeTick, open]);

  const totals = useMemo(() => {
    if (!draft) return { totaleRicambi: 0, totaleManodopera: 0, totaleFinale: 0 };
    return calcolaTotaliPreventivo(draft);
  }, [draft]);

  const applyTotals = useCallback((d: PreventivoRecord): PreventivoRecord => {
    const t = calcolaTotaliPreventivo(d);
    return { ...d, ...t };
  }, []);

  const isDirty = useMemo(() => {
    const cur = draft;
    const base = baselineRef.current;
    if (!cur || !base) return false;
    return JSON.stringify(applyTotals(cur)) !== JSON.stringify(applyTotals(base));
  }, [draft, applyTotals]);

  const marcheEditorOpts = prefsAtt.marche;
  const modelliEditor = useMemo(
    () => modelliVisibiliPerMarca(prefsAtt, draft?.marcaAttrezzatura?.trim() || "__tutti__"),
    [prefsAtt, draft?.marcaAttrezzatura],
  );

  function requestClose() {
    if (!isDirty) {
      setUnsavedExitOpen(false);
      onClose();
      return;
    }
    setUnsavedExitOpen(true);
  }

  function patch(p: Partial<PreventivoRecord>) {
    setDraft((prev) => (prev ? applyTotals({ ...prev, ...p }) : prev));
  }

  function patchRiga(id: string, patchRow: Partial<PreventivoRigaRicambio>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const righeRicambi = prev.righeRicambi.map((r) => (r.id === id ? { ...r, ...patchRow } : r));
      return applyTotals({ ...prev, righeRicambi });
    });
  }

  function addRiga() {
    setDraft((prev) => {
      if (!prev) return prev;
      const id = `prr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const righeRicambi = [
        ...prev.righeRicambi,
        {
          id,
          ricambioId: null,
          codiceOE: "",
          descrizione: "",
          quantita: 1,
          prezzoUnitario: 0,
          scontoPercent: 0,
        },
      ];
      return applyTotals({ ...prev, righeRicambi });
    });
  }

  function removeRiga(id: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return applyTotals({ ...prev, righeRicambi: prev.righeRicambi.filter((r) => r.id !== id) });
    });
  }

  function patchAddettoRow(idx: number, patchRow: { addetto?: string; ore?: number }) {
    setDraft((prev) => {
      if (!prev) return prev;
      const righeAddetti = prev.manodopera.righeAddetti.map((r, i) => (i === idx ? { ...r, ...patchRow } : r));
      const oreTotali = Math.max(1, Math.round(righeAddetti.reduce((s, x) => s + (Number.isFinite(x.ore) ? x.ore : 0), 0) * 100) / 100);
      return applyTotals({
        ...prev,
        manodopera: { ...prev.manodopera, righeAddetti, oreTotali },
      });
    });
  }

  function addAddettoRow() {
    setDraft((prev) => {
      if (!prev) return prev;
      const righeAddetti = [...prev.manodopera.righeAddetti, { addetto: "", ore: 1 }];
      const oreTotali = Math.max(1, Math.round(righeAddetti.reduce((s, x) => s + (Number.isFinite(x.ore) ? x.ore : 0), 0) * 100) / 100);
      return applyTotals({ ...prev, manodopera: { ...prev.manodopera, righeAddetti, oreTotali } });
    });
  }

  function removeAddettoRow(idx: number) {
    setDraft((prev) => {
      if (!prev) return prev;
      const righeAddetti = prev.manodopera.righeAddetti.filter((_, i) => i !== idx);
      if (righeAddetti.length === 0) {
        return applyTotals({
          ...prev,
          manodopera: { ...prev.manodopera, righeAddetti: [{ addetto: "Officina", ore: 1 }], oreTotali: 1 },
        });
      }
      const oreTotali = Math.max(1, Math.round(righeAddetti.reduce((s, x) => s + (Number.isFinite(x.ore) ? x.ore : 0), 0) * 100) / 100);
      return applyTotals({ ...prev, manodopera: { ...prev.manodopera, righeAddetti, oreTotali } });
    });
  }

  function onSalva() {
    const cur = draftRef.current;
    if (!cur) return;
    const now = new Date().toISOString();
    const u = autore.trim() || "Operatore";
    const next = applyTotals({
      ...cur,
      aggiornatoAt: now,
      lastEditedBy: u,
    });
    const baseline = baselineRef.current;
    maybeRecordLearningOnSave(baseline, next);
    if (isNew) {
      appendPreventivo(next);
      appendPreventiviChangeLog({
        tone: "create",
        tipoRiga: "CREAZIONE PREVENTIVO",
        oggettoRiga: `Preventivo ${next.numero}`,
        modificaRiga: `Cliente: ${next.cliente || "—"}. Totale ${next.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €. ${
          next.lavorazioneId.trim()
            ? `Lavorazione ${next.lavorazioneId} (${next.lavorazioneOrigine}).`
            : "Preventivo manuale (nessuna lavorazione collegata)."
        }`,
        autore: u,
        atIso: now,
      });
    } else {
      upsertPreventivo(next);
      const base = baseline;
      const changed =
        !base || JSON.stringify(applyTotals(cloneRecord(base))) !== JSON.stringify(applyTotals(cloneRecord(next)));
      if (changed) {
        appendPreventiviChangeLog({
          tone: "update",
          tipoRiga: "AGGIORNAMENTO PREVENTIVO",
          oggettoRiga: `Preventivo ${next.numero}`,
          modificaRiga: "Salvate modifiche a intestazione, righe ricambi/manodopera, totali o note.",
          autore: u,
          atIso: now,
        });
      }
    }
    baselineRef.current = cloneRecord(next);
    setUnsavedExitOpen(false);
    onSaved();
    onClose();
  }

  if (!open || !draft) return null;

  return (
    <LavorazioniModalShell wide maxWidthClass="max-w-5xl" onRequestClose={requestClose}>
      <div className="relative flex max-h-[min(92dvh,900px)] min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {isNew ? "Nuovo preventivo" : `Preventivo ${draft.numero}`}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Il sistema propone testi e importi: tutto è modificabile prima del salvataggio.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 gestionale-scrollbar">
          <div className="space-y-6">
            <section className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Intestazione
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs">
                  <span className="text-zinc-500">Numero</span>
                  <input className={`${dsInput} mt-1`} readOnly value={draft.numero} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Data creazione</span>
                  <input className={`${dsInput} mt-1`} readOnly value={fmtDayIt(draft.dataCreazione)} />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Anagrafica cliente
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block text-xs sm:col-span-1">
                  <span className="text-zinc-500">Cliente</span>
                  <input className={`${dsInput} mt-1`} value={draft.cliente} onChange={(e) => patch({ cliente: e.target.value })} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Cantiere</span>
                  <input className={`${dsInput} mt-1`} value={draft.cantiere} onChange={(e) => patch({ cantiere: e.target.value })} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Utilizzatore</span>
                  <input
                    className={`${dsInput} mt-1`}
                    value={draft.utilizzatore}
                    onChange={(e) => patch({ utilizzatore: e.target.value })}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Identificazione macchina
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-xs">
                  <span className="text-zinc-500">Targa</span>
                  <input className={`${dsInput} mt-1`} value={draft.targa} onChange={(e) => patch({ targa: e.target.value })} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Matricola</span>
                  <input className={`${dsInput} mt-1`} value={draft.matricola} onChange={(e) => patch({ matricola: e.target.value })} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">N. scuderia</span>
                  <input className={`${dsInput} mt-1`} value={draft.nScuderia} onChange={(e) => patch({ nScuderia: e.target.value })} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Marca attrezzatura</span>
                  <select
                    className={`${dsInput} mt-1`}
                    value={draft.marcaAttrezzatura}
                    onChange={(e) => {
                      const marca = e.target.value;
                      setDraft((prev) => {
                        if (!prev) return prev;
                        const p = migrateMezziListePrefs(getMezziListePrefsOrDefault());
                        const opts = marca.trim() ? modelliVisibiliPerMarca(p, marca) : [...p.modelli];
                        let modello = prev.modelloAttrezzatura;
                        if (modello.trim() && !opts.includes(modello.trim())) modello = "";
                        const macchinaRiassunto = [marca, modello].filter(Boolean).join(" ").trim();
                        return applyTotals({
                          ...prev,
                          marcaAttrezzatura: marca,
                          modelloAttrezzatura: modello,
                          macchinaRiassunto: macchinaRiassunto || prev.macchinaRiassunto,
                        });
                      });
                    }}
                  >
                    <option value="">—</option>
                    {marcheEditorOpts.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    {draft.marcaAttrezzatura.trim() && !marcheEditorOpts.includes(draft.marcaAttrezzatura.trim()) ? (
                      <option value={draft.marcaAttrezzatura}>{draft.marcaAttrezzatura} (salvato)</option>
                    ) : null}
                  </select>
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="text-zinc-500">Modello</span>
                  <select
                    className={`${dsInput} mt-1`}
                    value={draft.modelloAttrezzatura}
                    onChange={(e) => {
                      const modello = e.target.value;
                      setDraft((prev) => {
                        if (!prev) return prev;
                        const macchinaRiassunto = [prev.marcaAttrezzatura, modello].filter(Boolean).join(" ").trim();
                        return applyTotals({
                          ...prev,
                          modelloAttrezzatura: modello,
                          macchinaRiassunto: macchinaRiassunto || prev.macchinaRiassunto,
                        });
                      });
                    }}
                  >
                    <option value="">—</option>
                    {modelliEditor.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    {draft.modelloAttrezzatura.trim() && !modelliEditor.includes(draft.modelloAttrezzatura.trim()) ? (
                      <option value={draft.modelloAttrezzatura}>{draft.modelloAttrezzatura} (salvato)</option>
                    ) : null}
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Lavorazioni (testo cliente)
              </h3>
              <textarea
                className={`${dsInput} mt-3 min-h-[8rem] resize-y`}
                value={draft.descrizioneLavorazioniCliente}
                onChange={(e) => patch({ descrizioneLavorazioniCliente: e.target.value })}
              />
              <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                Le modifiche qui vengono memorizzate come riferimento per preventivi futuri simili.
              </p>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Ricambi</h3>
                <button type="button" className={dsBtnNeutral} onClick={addRiga}>
                  Aggiungi riga
                </button>
              </div>
              <div className={`${dsTableWrap} ${dsScrollbar} mt-3`}>
                <table className={`${dsTable} min-w-[960px]`}>
                  <thead className="sticky top-0 z-[1] bg-[var(--cab-card)] shadow-[inset_0_-1px_0_0_var(--cab-border)]">
                    <tr>
                      <th className={dsTableHeadCell}>Codice OE</th>
                      <th className={`${dsTableHeadCell} min-w-[140px]`}>Descrizione</th>
                      <th className={`${dsTableHeadCell} w-24 text-right`}>Qtà</th>
                      <th className={`${dsTableHeadCell} w-28 text-right`}>Prezzo unit.</th>
                      <th className={`${dsTableHeadCell} w-24 text-right`}>Sconto %</th>
                      <th className={`${dsTableHeadCell} w-32 text-right`}>Totale netto</th>
                      <th className={`${dsTableHeadCell} w-10`} />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.righeRicambi.map((r) => (
                      <tr key={r.id} className={dsTableRow}>
                        <td className="px-2 py-1.5 align-top">
                          <input className={dsInput} value={r.codiceOE} onChange={(e) => patchRiga(r.id, { codiceOE: e.target.value })} />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input className={dsInput} value={r.descrizione} onChange={(e) => patchRiga(r.id, { descrizione: e.target.value })} />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            className={`${dsInput} text-right tabular-nums`}
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={r.quantita}
                            onChange={(e) => patchRiga(r.id, { quantita: Math.max(0.01, parseFloat(e.target.value) || 0) })}
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            className={`${dsInput} text-right tabular-nums`}
                            type="number"
                            min={0}
                            step={0.01}
                            value={r.prezzoUnitario}
                            onChange={(e) => patchRiga(r.id, { prezzoUnitario: Math.max(0, parseFloat(e.target.value) || 0) })}
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            className={`${dsInput} text-right tabular-nums`}
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={r.scontoPercent ?? 0}
                            onChange={(e) =>
                              patchRiga(r.id, { scontoPercent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5 align-middle text-right text-sm tabular-nums font-medium text-[color:var(--cab-text)]">
                          {fmtEuro(totaleNettoRigaRicambio(r))}
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <button type="button" className={`${dsBtnDanger} px-2 py-1 text-xs`} onClick={() => removeRiga(r.id)} aria-label="Elimina riga">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Manodopera</h3>
                <button type="button" className={dsBtnNeutral} onClick={addAddettoRow}>
                  Aggiungi addetto
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block text-xs">
                  <span className="text-zinc-500">Costo orario (€)</span>
                  <input
                    className={`${dsInput} mt-1 text-right tabular-nums`}
                    type="number"
                    min={0}
                    step={0.5}
                    value={draft.manodopera.costoOrario}
                    onChange={(e) => {
                      const v = Math.max(0, parseFloat(e.target.value) || 0);
                      setDraft((prev) =>
                        prev
                          ? applyTotals({
                              ...prev,
                              manodopera: { ...prev.manodopera, costoOrario: v },
                            })
                          : prev,
                      );
                    }}
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Sconto % manodopera</span>
                  <input
                    className={`${dsInput} mt-1 text-right tabular-nums`}
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={draft.manodopera.scontoPercent ?? 0}
                    onChange={(e) => {
                      const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                      setDraft((prev) =>
                        prev ? applyTotals({ ...prev, manodopera: { ...prev.manodopera, scontoPercent: v } }) : prev,
                      );
                    }}
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-500">Ore totali (calcolate)</span>
                  <input className={`${dsInput} mt-1 text-right tabular-nums`} readOnly value={String(draft.manodopera.oreTotali)} />
                </label>
              </div>
              <div className="mt-3 space-y-2">
                {draft.manodopera.righeAddetti.map((a, idx) => (
                  <div key={`${idx}-${a.addetto}`} className="flex flex-wrap items-end gap-2">
                    <label className="block min-w-[10rem] flex-1 text-xs">
                      <span className="text-zinc-500">Addetto</span>
                      <input
                        className={`${dsInput} mt-1`}
                        value={a.addetto}
                        onChange={(e) => patchAddettoRow(idx, { addetto: e.target.value })}
                      />
                    </label>
                    <label className="block w-28 text-xs">
                      <span className="text-zinc-500">Ore</span>
                      <input
                        className={`${dsInput} mt-1 text-right tabular-nums`}
                        type="number"
                        min={1}
                        step={1}
                        value={a.ore}
                        onChange={(e) => patchAddettoRow(idx, { ore: Math.max(1, Math.round(parseFloat(e.target.value) || 0)) })}
                      />
                    </label>
                    <button type="button" className={`${dsBtnDanger} mb-0.5 px-2 py-1 text-xs`} onClick={() => removeAddettoRow(idx)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Totali</h3>
              <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/60">
                <p className="flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>Totale ricambi (netto righe)</span>
                  <span className="tabular-nums font-medium">{fmtEuro(totals.totaleRicambi)}</span>
                </p>
                <p className="mt-1 flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>Totale manodopera</span>
                  <span className="tabular-nums font-medium">{fmtEuro(totals.totaleManodopera)}</span>
                </p>
                <p className="mt-2 flex justify-between border-t border-zinc-100 pt-2 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                  <span>Totale finale</span>
                  <span className="tabular-nums">{fmtEuro(totals.totaleFinale)}</span>
                </p>
              </div>
              <label className="mt-3 block text-xs">
                <span className="text-zinc-500">Note finali</span>
                <textarea
                  className={`${dsInput} mt-1 min-h-[4.5rem] resize-y`}
                  value={draft.noteFinali}
                  onChange={(e) => patch({ noteFinali: e.target.value })}
                />
              </label>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
          <button type="button" className={dsBtnNeutral} onClick={() => openPreventivoPdfInNewTab(applyTotals(draft), autore)}>
            Anteprima PDF
          </button>
          <button type="button" className={dsBtnNeutral} onClick={requestClose}>
            Annulla
          </button>
          <button type="button" className={dsBtnPrimary} onClick={onSalva}>
            Salva
          </button>
        </div>

        {unsavedExitOpen ? (
          <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Modifiche non salvate</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Hai modifiche non salvate. Come vuoi procedere?
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <button type="button" className={dsBtnNeutral} onClick={() => setUnsavedExitOpen(false)}>
                  Resta
                </button>
                <button
                  type="button"
                  className={dsBtnDanger}
                  onClick={() => {
                    setUnsavedExitOpen(false);
                    onClose();
                  }}
                >
                  Esci senza salvare
                </button>
                <button
                  type="button"
                  className={dsBtnPrimary}
                  onClick={() => {
                    onSalva();
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
  );
}
