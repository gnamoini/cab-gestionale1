"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  dsFocus,
  dsBtnNeutral,
  dsBtnPrimary,
  dsBtnCtaHero,
  dsBtnSoftOrange,
  dsBtnIcon,
  dsBtnSubtle,
  dsTableThSticky,
  gestionaleSelectFilterClass,
  gestionaleSelectNativePlainClass,
  lavorazioniModalSelectClass,
  selectLavorazioniInline,
  selectPillInner,
} from "@/lib/ui/design-system";
import { pillStyleFromHex } from "@/lib/lavorazioni/color-utils";
import type { SortKeyLavorazione, SortKeyStorico, SortPhaseLav } from "@/lib/lavorazioni/types";

/** @deprecated Importare da `@/lib/ui/design-system` — mantenuti per compatibilità. */
export const erpFocus = dsFocus;
export const erpBtnNeutral = dsBtnNeutral;
export const erpBtnAccent = dsBtnPrimary;
export const erpBtnNuovaLavorazione = dsBtnCtaHero;
export const erpBtnSoftOrange = dsBtnSoftOrange;
export const erpBtnIcon = dsBtnIcon;
export const erpBtnSubtleNew = dsBtnSubtle;
export { gestionaleSelectFilterClass, gestionaleSelectNativePlainClass, lavorazioniModalSelectClass, selectLavorazioniInline, selectPillInner };
/** @deprecated Usa `gestionaleSelectFilterClass` */
export const selectLavorazioniFilter = gestionaleSelectFilterClass;

export function SortThMain({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
}: {
  label: string;
  columnKey: SortKeyLavorazione;
  sortColumn: SortKeyLavorazione | null;
  sortPhase: SortPhaseLav;
  onSort: (k: SortKeyLavorazione) => void;
}) {
  const active = sortColumn === columnKey && (sortPhase === "asc" || sortPhase === "desc");
  let icon: ReactNode = <span className="opacity-40">↕</span>;
  if (active) {
    icon = sortPhase === "asc" ? <span>↑</span> : <span>↓</span>;
  }
  return (
    <th className={`${dsTableThSticky} px-3 py-2 text-left align-middle`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors duration-200 ease-out ${dsFocus} ${
          active ? "text-[color:var(--cab-primary)]" : "text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-text)]"
        }`}
      >
        {label}
        {icon}
      </button>
    </th>
  );
}

export function SortThStorico({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
}: {
  label: string;
  columnKey: SortKeyStorico;
  sortColumn: SortKeyStorico | null;
  sortPhase: SortPhaseLav;
  onSort: (k: SortKeyStorico) => void;
}) {
  const active = sortColumn === columnKey && (sortPhase === "asc" || sortPhase === "desc");
  let icon: ReactNode = <span className="opacity-40">↕</span>;
  if (active) {
    icon = sortPhase === "asc" ? <span>↑</span> : <span>↓</span>;
  }
  return (
    <th className={`${dsTableThSticky} px-3 py-2 text-left align-middle`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors duration-200 ease-out ${dsFocus} ${
          active ? "text-[color:var(--cab-primary)]" : "text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-text)]"
        }`}
      >
        {label}
        {icon}
      </button>
    </th>
  );
}

export function FilterSelectWrap({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full min-w-[11rem] max-w-full">
      <span
        className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-orange-400"
        aria-hidden
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
      {children}
    </div>
  );
}

export function prioritaLabel(p: string) {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/** Classi layout pill tabella (colori da `*PillShellStyle` + inline style). */
export function statoPillShellClass(): string {
  return "relative inline-flex w-full min-w-[6.75rem] items-center rounded-lg border border-black/10 shadow-sm shadow-black/15 transition-[filter,box-shadow] duration-200 ease-out hover:brightness-[1.04] focus-within:ring-2 focus-within:ring-orange-400/45 dark:border-white/10";
}

export function statoPillShellStyle(hex: string | undefined): CSSProperties {
  return pillStyleFromHex(hex);
}

export function prioritaPillShellClass(): string {
  return "relative inline-flex w-full min-w-[5.75rem] items-center rounded-lg border border-black/10 shadow-sm shadow-black/12 transition-[filter,box-shadow] duration-200 ease-out hover:brightness-[1.04] focus-within:ring-2 focus-within:ring-orange-400/45 dark:border-white/10";
}

export function prioritaPillShellStyle(hex: string | undefined): CSSProperties {
  return pillStyleFromHex(hex);
}

export function addettoPillShellClass(): string {
  return "relative inline-flex w-full min-w-[6.5rem] items-center rounded-lg border border-black/10 shadow-sm shadow-black/15 transition-[filter,box-shadow] duration-200 ease-out hover:brightness-[1.04] focus-within:ring-2 focus-within:ring-orange-400/45 dark:border-white/10";
}

export function addettoPillShellStyle(hex: string | undefined): CSSProperties {
  return pillStyleFromHex(hex);
}

/** Badge compatto (storico / filtri). */
export function prioritaBadgeStyle(hex: string | undefined): CSSProperties {
  return { ...pillStyleFromHex(hex), fontWeight: 600 };
}

export function addettoBadgeStyle(hex: string | undefined): CSSProperties {
  return { ...pillStyleFromHex(hex), fontWeight: 600 };
}
