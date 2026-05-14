"use client";

import type { ReactNode } from "react";
import { dsFocus, dsTableSortTh } from "@/lib/ui/design-system";

/** Allineato al gestionale: 1° click asc, 2° desc, 3° ordine naturale (nessun highlight). */
export type ReportSortPhase = "natural" | "asc" | "desc";

export function cycleReportSort<K extends string>(
  sortColumn: K | null,
  sortPhase: ReportSortPhase,
  key: K,
): { column: K | null; phase: ReportSortPhase } {
  if (sortColumn !== key) return { column: key, phase: "asc" };
  if (sortPhase === "asc") return { column: key, phase: "desc" };
  if (sortPhase === "desc") return { column: null, phase: "natural" };
  return { column: key, phase: "asc" };
}

export function ReportSortTh<K extends string>({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  columnKey: K;
  sortColumn: K | null;
  sortPhase: ReportSortPhase;
  onSort: (k: K) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sortColumn === columnKey && (sortPhase === "asc" || sortPhase === "desc");
  let icon: ReactNode = <span className="opacity-40">↕</span>;
  if (active) icon = sortPhase === "asc" ? <span>↑</span> : <span>↓</span>;
  return (
    <th className={`${dsTableSortTh} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex w-full items-center gap-1 transition-colors duration-200 ease-out ${dsFocus} ${
          align === "right" ? "justify-end" : "justify-start"
        } ${
          active
            ? "text-[color:var(--cab-primary)]"
            : "text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-text)]"
        }`}
      >
        <span className="leading-tight">{label}</span>
        {icon}
      </button>
    </th>
  );
}
