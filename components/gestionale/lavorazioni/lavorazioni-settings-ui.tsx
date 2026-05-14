"use client";

import { useEffect, useRef, useState } from "react";
import { LAVORAZIONE_STATO_COMPLETATA_ID } from "@/lib/lavorazioni/constants";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";

export function ColorSwatchButton({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (hex: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hex = normalizeHex(value) ?? "#52525b";

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className="h-8 w-8 rounded-md border-2 border-zinc-300 shadow-sm transition hover:ring-2 hover:ring-orange-400/45 dark:border-zinc-600"
        style={{ backgroundColor: hex }}
        onClick={() => setOpen((o) => !o)}
      />
      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-[120] flex min-w-[9rem] flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Scegli colore
          </span>
          <input
            type="color"
            value={hex}
            className="h-10 w-full max-w-[10rem] cursor-pointer overflow-hidden rounded border border-zinc-200 bg-zinc-50 p-0 dark:border-zinc-600 dark:bg-zinc-800"
            onChange={(e) => {
              const nh = normalizeHex(e.target.value);
              if (nh) onChange(nh);
            }}
          />
          <button
            type="button"
            className="text-left text-xs font-medium text-orange-600 hover:underline dark:text-orange-400"
            onClick={() => setOpen(false)}
          >
            Chiudi
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function StatoSettingsList({
  stati,
  onChangeLabel,
  onChangeStatoColor,
  onRemove,
  attiviStatoIds,
  storicoStatoIds,
  inputClass,
}: {
  stati: StatoLavorazioneConfig[];
  onChangeLabel: (id: string, label: string) => void;
  onChangeStatoColor: (id: string, hex: string) => void;
  onRemove: (id: string) => void;
  attiviStatoIds: Set<string>;
  storicoStatoIds: Set<string>;
  inputClass: string;
}) {
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {stati.map((s) => {
        const inUse = attiviStatoIds.has(s.id) || storicoStatoIds.has(s.id);
        const canDelete = s.id !== LAVORAZIONE_STATO_COMPLETATA_ID && !inUse;
        const displayHex = statoDisplayColor(s.id, stati);
        return (
          <li key={s.id} className="flex min-h-[2.75rem] flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0">
            <input
              className={`${inputClass} min-w-0 flex-1 basis-[12rem] text-sm`}
              value={s.label}
              onChange={(e) => onChangeLabel(s.id, e.target.value)}
              aria-label="Nome stato"
            />
            <ColorSwatchButton
              value={displayHex}
              ariaLabel={`Colore stato ${s.label || s.id}`}
              onChange={(hex) => onChangeStatoColor(s.id, hex)}
            />
            <button
              type="button"
              disabled={!canDelete}
              className="ml-auto shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
              title={canDelete ? "Elimina stato" : "Stato in uso o obbligatorio"}
              onClick={() => onRemove(s.id)}
            >
              Elimina
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function AddettiSettingsList({
  addetti,
  addettoColors,
  onChangeAddettoColor,
  onRenameBlur,
  onRemove,
  attiviAddetti,
  storicoAddetti,
  inputClass,
}: {
  addetti: string[];
  addettoColors: Record<string, string>;
  onChangeAddettoColor: (nome: string, hex: string) => void;
  onRenameBlur: (previousName: string, nextName: string) => void;
  onRemove: (name: string) => void;
  attiviAddetti: Set<string>;
  storicoAddetti: Set<string>;
  inputClass: string;
}) {
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {addetti.map((a) => {
        const inUse = attiviAddetti.has(a) || storicoAddetti.has(a);
        const displayHex = addettoDisplayColor(a, addettoColors);
        return (
          <li key={a} className="flex min-h-[2.75rem] flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0">
            <input
              key={a}
              className={`${inputClass} min-w-0 flex-1 basis-[12rem] text-sm`}
              defaultValue={a}
              aria-label="Nome addetto"
              onBlur={(e) => onRenameBlur(a, e.target.value)}
            />
            <ColorSwatchButton
              value={displayHex}
              ariaLabel={`Colore addetto ${a}`}
              onChange={(hex) => onChangeAddettoColor(a, hex)}
            />
            <button
              type="button"
              className="ml-auto shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
              title={
                inUse
                  ? "Rimuove dalla lista futura; i record già assegnati mantengono il nome"
                  : "Elimina addetto"
              }
              onClick={() => onRemove(a)}
            >
              Elimina
            </button>
          </li>
        );
      })}
    </ul>
  );
}
