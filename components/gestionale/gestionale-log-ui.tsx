"use client";

import type { ReactNode, SVGProps } from "react";
import { memo } from "react";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { GestionaleLogEventTone, GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { formatGestionaleLogMetaLine } from "@/lib/gestionale-log/view-model";

/** Icona unificata “log / cronologia” (stroke 2, stile coerente con impostazioni e toolbar). */
export function IconGestionaleLog(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4 shrink-0 opacity-90"}
      aria-hidden
      {...rest}
    >
      <path d="M3 3v5h5" />
      <path d="M3.05 13a9 9 0 1 0 .5-4" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/** Scrollbar sottile coerente con zinc/orange del gestionale — scroll interno sempre attivo (no doppio scroll). */
export const gestionaleLogScrollClass =
  "gestionale-scrollbar min-h-0 flex-1 overflow-y-scroll overscroll-contain [scrollbar-gutter:stable]";

/** Lista log in contenitori annidati (pannello / modale). */
export const gestionaleLogScrollEmbeddedClass =
  "gestionale-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]";

export const gestionaleLogPanelAsideClass =
  "flex h-full max-h-dvh min-h-0 w-full max-w-md flex-col overflow-hidden border-l border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-2xl";

export const gestionaleLogPanelHeaderClass =
  "flex shrink-0 items-center justify-between border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))] px-4 py-3 backdrop-blur-sm";

const TONE_BADGE: Record<GestionaleLogEventTone, string> = {
  create:
    "border border-emerald-300/80 bg-emerald-100 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-50",
  update:
    "border border-orange-300/80 bg-orange-100 text-orange-950 dark:border-orange-800/55 dark:bg-orange-950/45 dark:text-orange-50",
  delete: "border border-red-300/80 bg-red-100 text-red-950 dark:border-red-900/55 dark:bg-red-950/45 dark:text-red-50",
  complete: "border border-sky-300/80 bg-sky-100 text-sky-950 dark:border-sky-900/55 dark:bg-sky-950/45 dark:text-sky-50",
  archive: "border border-zinc-300/80 bg-zinc-200 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100",
  reopen:
    "border border-indigo-300/80 bg-indigo-100 text-indigo-950 dark:border-indigo-900/55 dark:bg-indigo-950/45 dark:text-indigo-50",
  neutral: "border border-zinc-300/80 bg-zinc-100 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100",
};

const TONE_BORDER: Record<GestionaleLogEventTone, string> = {
  create: "border-l-emerald-500",
  update: "border-l-orange-500",
  delete: "border-l-red-500",
  complete: "border-l-sky-500",
  archive: "border-l-zinc-400",
  reopen: "border-l-indigo-500",
  neutral: "border-l-zinc-400",
};

export type CampoChangeLine = { campo: string; prima: string; dopo: string };

/** Dettaglio campi (opzionale, sotto le 4 righe principali). */
export function GestionaleLogChangeList({
  changes,
  limit = 12,
  compact,
}: {
  changes: CampoChangeLine[];
  limit?: number;
  compact?: boolean;
}) {
  if (changes.length === 0) return null;
  const slice = changes.slice(0, limit);
  const textXs = compact ? "text-[10px]" : "text-[11px]";
  const pad = compact ? "mt-2 space-y-0.5 border-t border-zinc-100/90 pt-2 dark:border-zinc-800" : "mt-3 space-y-1 border-t border-zinc-200/80 pt-2.5 dark:border-zinc-700/80";
  return (
    <ul className={pad}>
      {slice.map((ch, i) => (
        <li key={`${ch.campo}-${i}`} className={`${textXs} leading-relaxed text-zinc-600 dark:text-zinc-400`}>
          <span className="font-medium text-zinc-500 dark:text-zinc-500">{ch.campo}:</span>{" "}
          <span className="font-mono text-zinc-500 line-through decoration-zinc-400/60 dark:text-zinc-500">{ch.prima}</span>
          {" → "}
          <span className="font-mono text-emerald-800 dark:text-emerald-300">{ch.dopo}</span>
        </li>
      ))}
    </ul>
  );
}

export const logEntryDismissBtnClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-sm font-semibold text-zinc-400 transition-colors hover:border-zinc-200 hover:bg-white hover:text-red-600 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-red-400";

export function GestionaleLogEntryFourLines({
  vm,
  onClick,
  title,
  children,
  trailing,
}: {
  vm: GestionaleLogViewModel;
  onClick?: () => void;
  title?: string;
  children?: ReactNode;
  /** Es. pulsante rimozione voce log (non interferisce con onClick sulla card). */
  trailing?: ReactNode;
}) {
  const cardClass = `relative rounded-xl border border-zinc-200/90 bg-zinc-50/40 pl-3.5 dark:border-zinc-700/90 dark:bg-zinc-800/30 ${TONE_BORDER[vm.tone]} border-l-[3px]`;

  const hover =
    "transition-[border-color,box-shadow,background-color] duration-150 hover:border-orange-200/90 hover:bg-orange-50/45 hover:shadow-sm dark:hover:border-orange-900/50 dark:hover:bg-orange-950/25";

  const body = (
    <div className={`py-3 pr-3.5 ${trailing ? "pr-12" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Tipo modifica</p>
      <div className="mt-0.5">
        <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${TONE_BADGE[vm.tone]}`}>
          {vm.tipoRiga}
        </span>
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Oggetto</p>
      <p className="mt-0.5 text-[14px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">{vm.oggettoRiga}</p>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Dettaglio</p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap break-words">{vm.modificaRiga}</p>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Autore e data</p>
      <p className="mt-0.5 border-t border-zinc-200/80 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 tabular-nums dark:border-zinc-700/80 dark:text-zinc-400">
        {formatGestionaleLogMetaLine(vm.autore, vm.atIso)}
      </p>
      {children}
    </div>
  );

  return (
    <div className={`${hover} ${erpFocus} rounded-xl`}>
      <div className={cardClass}>
        {trailing ? (
          <div className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
            {trailing}
          </div>
        ) : null}
        {onClick ? (
          <button type="button" onClick={onClick} title={title} className="w-full rounded-xl text-left outline-none">
            {body}
          </button>
        ) : (
          body
        )}
      </div>
    </div>
  );
}

export const GestionaleLogList = memo(function GestionaleLogList({ children }: { children: ReactNode }) {
  return <ul className="list-none space-y-3 text-sm">{children}</ul>;
});

export const GestionaleLogEmpty = memo(function GestionaleLogEmpty({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_65%,var(--cab-card))] px-3 py-4 text-sm text-[color:var(--cab-text-muted)]">
      {message}
    </p>
  );
});

export type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
export {
  buildLavorazioniGestionaleLogViewModel,
  buildMagazzinoGestionaleLogViewModel,
  buildMezziGestionaleLogViewModel,
  formatGestionaleLogDateTime,
  gestionaleLogToneLavorazioni,
  gestionaleLogToneMagazzino,
} from "@/lib/gestionale-log/view-model";
