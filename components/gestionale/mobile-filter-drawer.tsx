"use client";

import { useEffect, type ReactNode } from "react";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnNeutral } from "@/lib/ui/design-system";

type MobileFilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  onReset?: () => void;
  onApply?: () => void;
  /** Se omesso, il pulsante "Applica" chiude il drawer. */
  applyLabel?: string;
};

export function MobileFilterDrawer({
  open,
  onClose,
  title = "Filtri",
  children,
  onReset,
  onApply,
  applyLabel = "Applica",
}: MobileFilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Chiudi filtri"
        onClick={onClose}
      />
      <div
        className="cab-drawer-panel absolute inset-y-0 right-0 flex w-[min(100%,22rem)] max-w-[100vw] flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cab-filter-drawer-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 id="cab-filter-drawer-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <button type="button" onClick={onClose} className={`${dsBtnNeutral} min-h-11 px-3 ${erpFocus}`}>
            Chiudi
          </button>
        </div>
        <div className="gestionale-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">{children}</div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
          {onReset ? (
            <button type="button" onClick={onReset} className={`${dsBtnNeutral} min-h-11 w-full justify-center`}>
              Reimposta
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onApply?.();
              onClose();
            }}
            className={`min-h-11 w-full justify-center rounded-lg border border-orange-400/80 bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 ${erpFocus}`}
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
