"use client";

import type { ReactNode } from "react";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { lavorazioniModalSelectClass } from "@/components/gestionale/lavorazioni/lavorazioni-shared";

/** Select modale con chevron a destra e rotazione leggera su focus (menu a tendina). */
export function LavorazioniModalSelect({
  value,
  onChange,
  ariaLabel,
  id,
  accentHex,
  children,
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
  id?: string;
  /** Anteprima colore voce selezionata (bordo sinistro). */
  accentHex?: string | null;
  children: ReactNode;
}) {
  const line = accentHex ? normalizeHex(accentHex) : null;
  return (
    <div
      className="group relative w-full overflow-hidden rounded-lg"
      style={line ? { boxShadow: `inset 3px 0 0 0 ${line}` } : undefined}
    >
      <select
        id={id}
        className={lavorazioniModalSelectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      >
        {children}
      </select>
      <span
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-orange-500 transition-transform duration-200 ease-out group-focus-within:rotate-180 dark:text-orange-400"
        aria-hidden
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}
