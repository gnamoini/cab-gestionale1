"use client";

import { useRef } from "react";
import { dateInputValueToIso, isoToItDisplay } from "@/lib/lavorazioni/date-day-only";

/** Data solo giorno: digitazione gg/mm/aaaa o aaaa-mm-gg + pulsante calendario nativo (showPicker). */
export function LavorazioniDateField({
  value,
  onChange,
  inputClassName,
  id,
  required,
  placeholder = "gg/mm/aaaa",
}: {
  value: string;
  onChange: (next: string) => void;
  inputClassName: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  return (
    <div className="lavorazioni-date-picker-host relative w-full">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        className={`${inputClassName} pr-11`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        ref={pickerRef}
        type="date"
        className="lavorazioni-date-native pointer-events-none absolute h-px w-px opacity-0"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          const r = dateInputValueToIso(v);
          if (r.ok) onChange(isoToItDisplay(r.iso));
        }}
      />
      <button
        type="button"
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-zinc-500/80 bg-zinc-800 text-zinc-100 shadow-md shadow-black/30 outline-none transition hover:border-orange-500/55 hover:bg-zinc-700 hover:text-orange-200 focus-visible:border-orange-500/75 focus-visible:ring-2 focus-visible:ring-orange-400/40"
        onClick={() => void pickerRef.current?.showPicker?.()}
        aria-label="Apri calendario"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>
    </div>
  );
}
