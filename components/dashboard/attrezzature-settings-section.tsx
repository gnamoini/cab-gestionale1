"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  aggiungiMarca,
  aggiungiModello,
  eliminaMarca,
  eliminaModello,
  migrateMezziListePrefs,
  rinominaMarca,
  rinominaModello,
} from "@/lib/mezzi/attrezzature-prefs";
import type { GestionaleLogEventTone } from "@/lib/gestionale-log/view-model";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { erpBtnNeutral, erpBtnSoftOrange, erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";

const CARD = "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900";
const INPUT =
  "min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-700 dark:bg-zinc-950";

type LogFn = (tone: GestionaleLogEventTone, tipoRiga: string, oggetto: string, dettaglio: string) => void;

export function AttrezzatureSettingsSection({
  liste,
  setListe,
  logDash,
}: {
  liste: MezziListePrefs;
  setListe: Dispatch<SetStateAction<MezziListePrefs>>;
  logDash: LogFn;
}) {
  const tree = useMemo(() => migrateMezziListePrefs(liste).attrezzature ?? [], [liste]);
  const [nuovaMarca, setNuovaMarca] = useState("");
  const [nuovoModelloByMarca, setNuovoModelloByMarca] = useState<Record<string, string>>({});
  /** Sessione: marche con elenco modelli espanso (default tutte chiuse). */
  const [expandedMarcaIds, setExpandedMarcaIds] = useState<Set<string>>(() => new Set());

  function setModelDraft(marcaId: string, v: string) {
    setNuovoModelloByMarca((prev) => ({ ...prev, [marcaId]: v }));
  }

  function toggleMarcaExpand(marcaId: string) {
    setExpandedMarcaIds((prev) => {
      const n = new Set(prev);
      if (n.has(marcaId)) n.delete(marcaId);
      else n.add(marcaId);
      return n;
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className={CARD}>
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">Attrezzature</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          Struttura unica: ogni marca ha i propri modelli. Usata in magazzino (compatibilità ricambi), mezzi, lavorazioni e preventivi.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className={`${INPUT} min-w-[12rem]`}
            value={nuovaMarca}
            onChange={(e) => setNuovaMarca(e.target.value)}
            placeholder="Nuova marca attrezzatura"
            autoComplete="off"
          />
          <button
            type="button"
            className={`${erpBtnSoftOrange} shrink-0 px-3 text-xs`}
            onClick={() => {
              const t = nuovaMarca.trim();
              if (!t) return;
              setListe((prev) => aggiungiMarca(prev, t));
              setNuovaMarca("");
              logDash("create", "AGGIORNAMENTO", "Impostazioni · Attrezzature", `Aggiunta marca «${t}»`);
            }}
          >
            Crea marca
          </button>
        </div>
      </div>

      {tree.length === 0 ? (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">Nessuna marca. Aggiungi la prima marca sopra.</p>
      ) : (
        <ul className="space-y-3">
          {tree.map((m) => {
            const modelliOpen = expandedMarcaIds.has(m.id);
            return (
              <li key={m.id} className={CARD}>
                <div className="flex flex-wrap items-start gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => toggleMarcaExpand(m.id)}
                    className={`mt-0.5 inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-600 shadow-sm hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 ${erpFocus}`}
                    aria-expanded={modelliOpen}
                    title={modelliOpen ? "Comprimi elenco modelli" : "Espandi elenco modelli"}
                  >
                    <span aria-hidden>{modelliOpen ? "▼" : "▶"}</span>
                    <span className="sr-only">{modelliOpen ? "Comprimi" : "Espandi"} modelli {m.nome}</span>
                  </button>
                  <input
                    className={`${INPUT} font-semibold text-zinc-900 dark:text-zinc-50`}
                    defaultValue={m.nome}
                    key={`${m.id}-${m.nome}`}
                    onBlur={(e) => {
                      const t = e.target.value.trim();
                      if (!t || t === m.nome) return;
                      setListe((prev) => rinominaMarca(prev, m.id, t));
                      logDash("create", "AGGIORNAMENTO", "Impostazioni · Attrezzature", `Marca rinominata «${m.nome}» → «${t}»`);
                    }}
                    aria-label={`Nome marca ${m.nome}`}
                  />
                  <button
                    type="button"
                    className={`${erpBtnNeutral} shrink-0 text-xs text-red-600 dark:text-red-400`}
                    onClick={() => {
                      if (!window.confirm(`Eliminare la marca «${m.nome}» e tutti i suoi modelli?`)) return;
                      setListe((prev) => eliminaMarca(prev, m.id));
                      setExpandedMarcaIds((prev) => {
                        const n = new Set(prev);
                        n.delete(m.id);
                        return n;
                      });
                      logDash("delete", "AGGIORNAMENTO", "Impostazioni · Attrezzature", `Rimossa marca «${m.nome}»`);
                    }}
                  >
                    Elimina marca
                  </button>
                </div>

                {modelliOpen ? (
                  <>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Modelli</p>
                    <ul className="mt-2 space-y-1.5">
                      {m.modelli.map((mod) => (
                        <li key={mod.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50/80 px-2 py-1.5 dark:bg-zinc-800/50">
                          <input
                            className={`${INPUT} text-zinc-800 dark:text-zinc-100`}
                            defaultValue={mod.nome}
                            key={`${mod.id}-${mod.nome}`}
                            onBlur={(e) => {
                              const t = e.target.value.trim();
                              if (!t || t === mod.nome) return;
                              setListe((prev) => rinominaModello(prev, m.id, mod.id, t));
                              logDash("create", "AGGIORNAMENTO", "Impostazioni · Attrezzature", `Modello «${mod.nome}» → «${t}» (${m.nome})`);
                            }}
                            aria-label={`Modello sotto ${m.nome}`}
                          />
                          <button
                            type="button"
                            className={`shrink-0 text-xs text-red-600 hover:underline dark:text-red-400 ${erpFocus}`}
                            onClick={() => {
                              if (!window.confirm(`Rimuovere il modello «${mod.nome}»?`)) return;
                              setListe((prev) => eliminaModello(prev, m.id, mod.id));
                              logDash("delete", "AGGIORNAMENTO", "Impostazioni · Attrezzature", `Rimosso modello «${mod.nome}» (${m.nome})`);
                            }}
                          >
                            Elimina
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        className={`${INPUT} min-w-[10rem]`}
                        value={nuovoModelloByMarca[m.id] ?? ""}
                        onChange={(e) => setModelDraft(m.id, e.target.value)}
                        placeholder="Nuovo modello"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className={`${erpBtnSoftOrange} shrink-0 px-2.5 text-xs`}
                        onClick={() => {
                          const t = (nuovoModelloByMarca[m.id] ?? "").trim();
                          if (!t) return;
                          setListe((prev) => aggiungiModello(prev, m.id, t));
                          setModelDraft(m.id, "");
                          logDash("create", "AGGIORNAMENTO", "Impostazioni · Attrezzature", `Aggiunto modello «${t}» (${m.nome})`);
                        }}
                      >
                        Aggiungi modello
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {m.modelli.length} modell{m.modelli.length === 1 ? "o" : "i"} — usa ▶ per aprire l&apos;elenco.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
