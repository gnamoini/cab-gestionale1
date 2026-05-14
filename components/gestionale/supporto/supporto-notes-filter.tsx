"use client";

import { dsSegmentedBtnOff, dsSegmentedBtnOn, dsSegmentedWrap } from "@/lib/ui/design-system";

export type SupportoNotesFilterKey = "all" | "open" | "resolved";

export function SupportoNotesFilter({
  value,
  onChange,
}: {
  value: SupportoNotesFilterKey;
  onChange: (next: SupportoNotesFilterKey) => void;
}) {
  const btn = (k: SupportoNotesFilterKey, label: string) => {
    const active = value === k;
    return (
      <button
        key={k}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => onChange(k)}
        className={active ? dsSegmentedBtnOn : dsSegmentedBtnOff}
      >
        {label}
      </button>
    );
  };

  return (
    <div role="tablist" aria-label="Filtro note" className={dsSegmentedWrap}>
      {btn("all", "Tutte")}
      {btn("open", "Aperte")}
      {btn("resolved", "Risolte")}
    </div>
  );
}
