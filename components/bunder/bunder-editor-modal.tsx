"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { erpBtnNeutral, erpFocus, gestionaleSelectFilterClass } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { applicaHintCliente, hintsByCliente } from "@/lib/bunder/bunder-cliente-hints";
import { appendBunderChangeLog } from "@/lib/bunder/bunder-change-log-storage";
import { bunderKindLabel } from "@/lib/bunder/doc-kind-meta";
import { openBunderPdfInNewTab } from "@/lib/bunder/bunder-pdf";
import { openBunderWordInNewTab, openBunderPrintPreview } from "@/lib/bunder/bunder-html-document";
import { righeFromPreventivo, totaleDocumento } from "@/lib/bunder/bunder-generate-default";
import { BUNDER_DOC_KIND_OPTIONS } from "@/lib/bunder/doc-kind-meta";
import { allocateNextNumero } from "@/lib/bunder/bunder-numbering";
import type { BunderCommercialDocument, BunderDocKind, BunderProductRiga } from "@/lib/bunder/types";
import { loadPreventivi } from "@/lib/preventivi/preventivi-storage";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { dsBtnDanger, dsBtnNeutral, dsBtnPrimary, dsInput, dsScrollbar, dsTable, dsTableHeadCell, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";

function nextRigaId(): string {
  return `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function BunderEditorModal({
  open,
  doc,
  allDocs,
  autore,
  onClose,
  onSave,
}: {
  open: boolean;
  doc: BunderCommercialDocument | null;
  allDocs: BunderCommercialDocument[];
  autore: string;
  onClose: () => void;
  onSave: (d: BunderCommercialDocument) => void;
}) {
  const [local, setLocal] = useState<BunderCommercialDocument | null>(null);
  const preventivi = useMemo(() => loadPreventivi(), [open]);
  const [prevPick, setPrevPick] = useState("");

  useEffect(() => {
    if (open && doc) setLocal({ ...doc });
    if (!open) setLocal(null);
  }, [open, doc]);

  const hintMap = useMemo(() => hintsByCliente(allDocs), [allDocs]);

  const applicaStoricoCliente = useCallback(() => {
    if (!local) return;
    const k = local.aziendaDestinatario.trim().toLowerCase();
    const h = hintMap.get(k);
    if (!h) return;
    setLocal(applicaHintCliente(local, h));
  }, [local, hintMap]);

  const onChangeKind = useCallback(
    (kind: BunderDocKind) => {
      if (!local) return;
      const others = allDocs.filter((x) => x.id !== local.id);
      const numero = allocateNextNumero(others, kind);
      setLocal({ ...local, kind, numeroProgressivo: numero });
    },
    [local, allDocs],
  );

  const importaPreventivo = useCallback(() => {
    if (!local || !prevPick) return;
    const p = preventivi.find((x) => x.id === prevPick);
    if (!p) return;
    const righe = righeFromPreventivo(p);
    setLocal({
      ...local,
      righe: righe.length ? righe : local.righe,
      aziendaDestinatario: p.cliente.trim() || local.aziendaDestinatario,
      oggetto: local.oggetto || `Riferimento preventivo ${p.numero} — ${p.macchinaRiassunto || "fornitura"}`,
    });
  }, [local, prevPick, preventivi]);

  const addRiga = useCallback(() => {
    if (!local) return;
    setLocal({
      ...local,
      righe: [
        ...local.righe,
        {
          id: nextRigaId(),
          quantita: 1,
          codice: "",
          nome: "",
          descrizioneTecnica: "",
          prezzoUnitario: 0,
        },
      ],
    });
  }, [local]);

  const updateRiga = useCallback((id: string, patch: Partial<BunderProductRiga>) => {
    if (!local) return;
    setLocal({
      ...local,
      righe: local.righe.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  }, [local]);

  const removeRiga = useCallback((id: string) => {
    if (!local) return;
    setLocal({ ...local, righe: local.righe.filter((r) => r.id !== id) });
  }, [local]);

  const salva = useCallback(() => {
    if (!local) return;
    const iso = new Date().toISOString();
    const next: BunderCommercialDocument = {
      ...local,
      updatedAt: iso,
      lastEditedBy: autore.trim() || "Operatore",
    };
    appendBunderChangeLog({
      tone: "update",
      tipoRiga: "MODIFICA DOCUMENTO",
      oggettoRiga: `${local.numeroProgressivo} · ${bunderKindLabel(local.kind)}`,
      modificaRiga: `Destinatario: ${local.aziendaDestinatario}. Totale indicativo: ${totaleDocumento(next).toLocaleString("it-IT", { minimumFractionDigits: 2 })} €.`,
      autore: autore.trim() || "Operatore",
      atIso: iso,
    });
    onSave(next);
    onClose();
  }, [local, autore, onSave, onClose]);

  const esportaPdf = useCallback(() => {
    if (!local) return;
    openBunderPdfInNewTab(local, autore);
    appendBunderChangeLog({
      tone: "neutral",
      tipoRiga: "ESPORTAZIONE PDF",
      oggettoRiga: `${local.numeroProgressivo}`,
      modificaRiga: "Apertura PDF in nuova scheda del browser.",
      autore: autore.trim() || "Operatore",
      atIso: new Date().toISOString(),
    });
  }, [local, autore]);

  const esportaWord = useCallback(() => {
    if (!local) return;
    openBunderWordInNewTab(local);
    appendBunderChangeLog({
      tone: "neutral",
      tipoRiga: "ESPORTAZIONE WORD",
      oggettoRiga: `${local.numeroProgressivo}`,
      modificaRiga: "Apertura documento Word (HTML) in nuova scheda.",
      autore: autore.trim() || "Operatore",
      atIso: new Date().toISOString(),
    });
  }, [local, autore]);

  const stampa = useCallback(() => {
    if (!local) return;
    openBunderPrintPreview(local);
    appendBunderChangeLog({
      tone: "neutral",
      tipoRiga: "STAMPA",
      oggettoRiga: `${local.numeroProgressivo}`,
      modificaRiga: "Anteprima di stampa aperta in nuova scheda.",
      autore: autore.trim() || "Operatore",
      atIso: new Date().toISOString(),
    });
  }, [local, autore]);

  if (!open || !local) return null;

  const tot = totaleDocumento(local);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950 sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">Documento commerciale — {local.numeroProgressivo}</h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{bunderKindLabel(local.kind)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={dsBtnNeutral} onClick={esportaWord}>
              Word
            </button>
            <button type="button" className={dsBtnNeutral} onClick={esportaPdf}>
              PDF
            </button>
            <button type="button" className={dsBtnNeutral} onClick={stampa}>
              Stampa
            </button>
            <button type="button" className={erpBtnNeutral} onClick={onClose}>
              Chiudi
            </button>
            <button type="button" className={dsBtnPrimary} onClick={salva}>
              Salva
            </button>
          </div>
        </div>

        <div className="gestionale-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Tipo documento
              <select
                className={`${gestionaleSelectFilterClass} mt-1 w-full`}
                value={local.kind}
                onChange={(e) => onChangeKind(e.target.value as BunderDocKind)}
              >
                {BUNDER_DOC_KIND_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Numero (automatico)
              <input className={`${dsInput} mt-1 w-full`} readOnly value={local.numeroProgressivo} />
            </label>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Data documento
              <input
                type="date"
                className={`${dsInput} mt-1 w-full`}
                value={local.dataDocumento}
                onChange={(e) => setLocal({ ...local, dataDocumento: e.target.value })}
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Luogo
              <input className={`${dsInput} mt-1 w-full`} value={local.luogo} onChange={(e) => setLocal({ ...local, luogo: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 sm:col-span-2">
              Riferimento interno
              <input
                className={`${dsInput} mt-1 w-full`}
                value={local.riferimentoInterno}
                onChange={(e) => setLocal({ ...local, riferimentoInterno: e.target.value })}
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Destinatario</p>
              <button type="button" className={`text-xs font-semibold text-orange-700 underline-offset-2 hover:underline dark:text-orange-300 ${erpFocus}`} onClick={applicaStoricoCliente}>
                Applica dati da ultimo documento stessa azienda
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 sm:col-span-2">
                Ragione sociale
                <input
                  className={`${dsInput} mt-1 w-full`}
                  value={local.aziendaDestinatario}
                  onChange={(e) => setLocal({ ...local, aziendaDestinatario: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 sm:col-span-2">
                Indirizzo
                <input className={`${dsInput} mt-1 w-full`} value={local.indirizzo} onChange={(e) => setLocal({ ...local, indirizzo: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                CAP
                <input className={`${dsInput} mt-1 w-full`} value={local.cap} onChange={(e) => setLocal({ ...local, cap: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Città
                <input className={`${dsInput} mt-1 w-full`} value={local.citta} onChange={(e) => setLocal({ ...local, citta: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Referente (C.a.)
                <input className={`${dsInput} mt-1 w-full`} value={local.referente} onChange={(e) => setLocal({ ...local, referente: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Settore / ambito
                <input className={`${dsInput} mt-1 w-full`} value={local.settore} onChange={(e) => setLocal({ ...local, settore: e.target.value })} />
              </label>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Importa righe da preventivo CAB</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Preventivo
                <select className={`${gestionaleSelectFilterClass} mt-1 w-full`} value={prevPick} onChange={(e) => setPrevPick(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {preventivi.map((p: PreventivoRecord) => (
                    <option key={p.id} value={p.id}>
                      {p.numero} · {p.cliente || "Cliente"} · {p.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className={dsBtnNeutral} onClick={importaPreventivo} disabled={!prevPick}>
                Importa righe
              </button>
            </div>
          </div>

          <label className="mt-4 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Oggetto
            <input className={`${dsInput} mt-1 w-full`} value={local.oggetto} onChange={(e) => setLocal({ ...local, oggetto: e.target.value })} />
          </label>
          <label className="mt-3 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Introduzione
            <textarea
              className={`${dsInput} mt-1 min-h-[72px] w-full resize-y`}
              value={local.intro}
              onChange={(e) => setLocal({ ...local, intro: e.target.value })}
            />
          </label>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Righe prodotto</p>
              <button type="button" className={`${dsBtnNeutral} text-xs`} onClick={addRiga}>
                + Riga
              </button>
            </div>
            <div className={`${dsTableWrap} ${dsScrollbar}`}>
              <table className={`${dsTable} min-w-[720px] text-[11px]`}>
                <thead className="sticky top-0 z-[1] bg-[var(--cab-card)] shadow-[inset_0_-1px_0_0_var(--cab-border)]">
                  <tr>
                    <th className={dsTableHeadCell}>Qtà</th>
                    <th className={dsTableHeadCell}>Codice</th>
                    <th className={dsTableHeadCell}>Nome</th>
                    <th className={dsTableHeadCell}>Descr. tecnica</th>
                    <th className={dsTableHeadCell}>Pr. unit.</th>
                    <th className={dsTableHeadCell}>Tot.</th>
                    <th className={`${dsTableHeadCell} w-8`} />
                  </tr>
                </thead>
                <tbody>
                  {local.righe.map((r) => (
                    <tr key={r.id} className={dsTableRow}>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          className={`${dsInput} w-16 py-1 text-xs`}
                          value={r.quantita}
                          min={0.01}
                          step={0.01}
                          onChange={(e) => updateRiga(r.id, { quantita: Math.max(0.01, Number(e.target.value) || 1) })}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input className={`${dsInput} w-24 py-1 text-xs`} value={r.codice} onChange={(e) => updateRiga(r.id, { codice: e.target.value })} />
                      </td>
                      <td className="px-1 py-1">
                        <input className={`${dsInput} min-w-[8rem] py-1 text-xs`} value={r.nome} onChange={(e) => updateRiga(r.id, { nome: e.target.value })} />
                      </td>
                      <td className="px-1 py-1">
                        <textarea
                          className={`${dsInput} min-h-[48px] min-w-[12rem] resize-y py-1 text-xs`}
                          value={r.descrizioneTecnica}
                          onChange={(e) => updateRiga(r.id, { descrizioneTecnica: e.target.value })}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          className={`${dsInput} w-24 py-1 text-xs`}
                          value={r.prezzoUnitario}
                          min={0}
                          step={0.01}
                          onChange={(e) => updateRiga(r.id, { prezzoUnitario: Math.max(0, Number(e.target.value) || 0) })}
                        />
                      </td>
                      <td className="px-2 py-1 tabular-nums text-[color:var(--cab-text)]">
                        {(r.quantita * r.prezzoUnitario).toLocaleString("it-IT", { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="px-1 py-1">
                        <button type="button" className={dsBtnDanger} onClick={() => removeRiga(r.id)} title="Elimina riga">
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-right text-sm font-semibold text-[color:var(--cab-text)]">Totale: {tot.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["iva", "IVA"],
                ["resa", "Resa"],
                ["trasporto", "Trasporto"],
                ["assemblaggio", "Assemblaggio"],
                ["consegna", "Consegna"],
                ["pagamento", "Pagamento"],
                ["garanzia", "Garanzia"],
                ["validitaOfferta", "Validità offerta"],
              ] as const
            ).map(([k, lab]) => (
              <label key={k} className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                {lab}
                <input
                  className={`${dsInput} mt-1 w-full`}
                  value={local.condizioni[k]}
                  onChange={(e) => setLocal({ ...local, condizioni: { ...local.condizioni, [k]: e.target.value } })}
                />
              </label>
            ))}
          </div>

          <label className="mt-4 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Clausole legali
            <textarea
              className={`${dsInput} mt-1 min-h-[120px] w-full resize-y`}
              value={local.clausoleLegali}
              onChange={(e) => setLocal({ ...local, clausoleLegali: e.target.value })}
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Chiusura
            <input className={`${dsInput} mt-1 w-full`} value={local.chiusura} onChange={(e) => setLocal({ ...local, chiusura: e.target.value })} />
          </label>
          <label className="mt-3 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Firma / note piè pagina
            <textarea className={`${dsInput} mt-1 min-h-[56px] w-full resize-y`} value={local.noteFirma} onChange={(e) => setLocal({ ...local, noteFirma: e.target.value })} />
          </label>
        </div>
      </div>
    </div>
  );
}
