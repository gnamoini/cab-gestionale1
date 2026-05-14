"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { erpBtnNeutral, erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsScrollbar, dsTable, dsTableHead, dsTableRow, dsTableWrap } from "@/lib/ui/design-system";

export function MagazzinoGiacenzaBell({
  count,
  items,
  onSelectRicambio,
  triggerClassName,
}: {
  count: number;
  items: RicambioMagazzino[];
  onSelectRicambio: (id: string) => void;
  triggerClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Avvisi giacenza"
      >
        <span className="relative inline-flex text-zinc-600 dark:text-zinc-300" aria-hidden>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {count > 0 ? (
            <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
        <span className="max-w-[10rem] truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">
          Avvisi giacenza{count > 0 ? ` (${count})` : ""}
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[52] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Ricambi sotto scorta minima"
            className="flex max-h-[min(88dvh,640px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Sotto scorta minima</h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {count === 0 ? "Nessun avviso attivo" : `${count} ricamb${count === 1 ? "io" : "i"} da verificare`}
                </p>
              </div>
              <button type="button" onClick={close} className={`${erpBtnNeutral} shrink-0 ${erpFocus}`}>
                Chiudi
              </button>
            </div>

            <div className="gestionale-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm font-medium text-emerald-700 dark:text-emerald-400">Tutto in regola.</p>
              ) : (
                <div className={`${dsTableWrap} ${dsScrollbar}`}>
                  <table className={`${dsTable} w-full min-w-[640px] text-left text-xs text-zinc-900 dark:text-zinc-100`}>
                    <thead className={`border-b border-zinc-100 dark:border-zinc-800 ${dsTableHead} text-[10px]`}>
                      <tr>
                        <th className="px-2 py-2">Marca</th>
                        <th className="px-2 py-2">Descrizione</th>
                        <th className="px-2 py-2">Codice</th>
                        <th className="px-2 py-2 text-right tabular-nums">Scorta</th>
                        <th className="px-2 py-2 text-right tabular-nums">Min.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p) => (
                        <tr key={p.id} className={dsTableRow}>
                          <td className="whitespace-nowrap px-2 py-2 align-top font-semibold uppercase text-red-800 dark:text-red-200">
                            {p.marca}
                          </td>
                          <td className="max-w-[280px] px-2 py-2 align-top">
                            <button
                              type="button"
                              className={`w-full text-left font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:text-orange-700 hover:decoration-orange-400 dark:text-zinc-50 dark:decoration-zinc-600 dark:hover:text-orange-300 ${erpFocus}`}
                              onClick={() => {
                                close();
                                onSelectRicambio(p.id);
                              }}
                            >
                              <span className="line-clamp-2">{p.descrizione}</span>
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                            {p.codiceFornitoreOriginale || "—"}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 align-top text-right font-mono tabular-nums font-semibold text-red-700 dark:text-red-300">
                            {p.scorta}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 align-top text-right font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                            {p.scortaMinima}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Clic su descrizione: chiude il pannello, evidenzia il ricambio in tabella e attiva il filtro «Sotto scorta minima».
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
