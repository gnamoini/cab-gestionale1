"use client";

import type { ReactNode } from "react";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";

function MezziFieldWrap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 basis-[min(100%,10rem)] flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-zinc-600/90 bg-zinc-900 px-3 text-sm font-medium text-zinc-50 shadow-md shadow-black/25 outline-none ring-orange-500/25 placeholder:text-zinc-500 focus:border-orange-500/75 focus:ring-2 dark:placeholder:text-zinc-500 " + erpFocus;

export type MezziFiltersProps = {
  search: string;
  onSearch: (v: string) => void;
  filtroCliente: string;
  onFiltroCliente: (v: string) => void;
  filtroMarca: string;
  onFiltroMarca: (v: string) => void;
  filtroModello: string;
  onFiltroModello: (v: string) => void;
  filtroTarga: string;
  onFiltroTarga: (v: string) => void;
  filtroNumeroScuderia: string;
  onFiltroNumeroScuderia: (v: string) => void;
};

export function MezziFilters({
  search,
  onSearch,
  filtroCliente,
  onFiltroCliente,
  filtroMarca,
  onFiltroMarca,
  filtroModello,
  onFiltroModello,
  filtroTarga,
  onFiltroTarga,
  filtroNumeroScuderia,
  onFiltroNumeroScuderia,
}: MezziFiltersProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="relative min-h-10 min-w-0 w-full">
        <span className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-zinc-400 dark:text-zinc-500" aria-hidden>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Ricerca rapida (cliente, marca, modello, targa, matricola, scuderia…)"
          className={`h-10 w-full rounded-lg border border-zinc-600/90 bg-zinc-900 py-2 pl-9 pr-3 text-sm font-medium text-zinc-50 shadow-md shadow-black/25 outline-none ring-orange-500/25 placeholder:text-zinc-500 focus:border-orange-500/75 focus:ring-2 dark:placeholder:text-zinc-500 ${erpFocus}`}
          aria-label="Cerca mezzi"
        />
      </div>

      <div className="flex w-full min-w-0 flex-wrap items-end gap-2 xl:gap-3">
        <MezziFieldWrap label="Cliente">
          <input
            type="text"
            value={filtroCliente}
            onChange={(e) => onFiltroCliente(e.target.value)}
            className={inputClass}
            placeholder="Contiene…"
            aria-label="Filtra cliente"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Marca">
          <input
            type="text"
            value={filtroMarca}
            onChange={(e) => onFiltroMarca(e.target.value)}
            className={inputClass}
            placeholder="Contiene…"
            aria-label="Filtra marca"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Modello">
          <input
            type="text"
            value={filtroModello}
            onChange={(e) => onFiltroModello(e.target.value)}
            className={inputClass}
            placeholder="Contiene…"
            aria-label="Filtra modello"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="Targa">
          <input
            type="text"
            value={filtroTarga}
            onChange={(e) => onFiltroTarga(e.target.value)}
            className={`${inputClass} font-mono`}
            placeholder="Contiene…"
            aria-label="Filtra targa"
          />
        </MezziFieldWrap>
        <MezziFieldWrap label="N. scuderia">
          <input
            type="text"
            value={filtroNumeroScuderia}
            onChange={(e) => onFiltroNumeroScuderia(e.target.value)}
            className={`${inputClass} font-mono`}
            placeholder="Contiene…"
            aria-label="Filtra numero scuderia"
          />
        </MezziFieldWrap>
      </div>
    </div>
  );
}
