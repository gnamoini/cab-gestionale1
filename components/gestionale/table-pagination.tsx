"use client";

import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnNeutral } from "@/lib/ui/design-system";

type Props = {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  label: string;
  className?: string;
};

function visibleNumberedPages(page: number, pageCount: number) {
  if (pageCount <= 1) {
    return {
      mid: [1],
      showFirst: false,
      showFirstGap: false,
      showLast: false,
      showLastGap: false,
    };
  }
  const maxSpan = 5;
  if (pageCount <= maxSpan) {
    const mid = Array.from({ length: pageCount }, (_, i) => i + 1);
    return { mid, showFirst: false, showFirstGap: false, showLast: false, showLastGap: false };
  }
  const delta = 2;
  let start = page - delta;
  let end = page + delta;
  if (start < 1) {
    end += 1 - start;
    start = 1;
  }
  if (end > pageCount) {
    start -= end - pageCount;
    end = pageCount;
  }
  start = Math.max(1, start);
  const mid: number[] = [];
  for (let i = start; i <= end; i += 1) mid.push(i);
  const first = mid[0]!;
  const last = mid[mid.length - 1]!;
  return {
    mid,
    showFirst: first > 1,
    showFirstGap: first > 2,
    showLast: last < pageCount,
    showLastGap: last < pageCount - 1,
  };
}

export function TablePagination({ page, pageCount, onPageChange, label, className }: Props) {
  if (pageCount <= 1) return null;

  const { mid, showFirst, showFirstGap, showLast, showLastGap } = visibleNumberedPages(page, pageCount);

  const btn =
    "inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div
      className={`flex flex-col gap-2 border-t border-zinc-100 px-2 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 ${className ?? ""}`}
    >
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 sm:text-left">{label}</p>
      <nav className="flex flex-wrap items-center justify-center gap-1 sm:justify-end" aria-label="Paginazione">
        <button
          type="button"
          className={`${btn} ${erpFocus}`}
          aria-label="Prima pagina"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
        >
          ≪
        </button>
        <button
          type="button"
          className={`${btn} ${erpFocus}`}
          aria-label="Pagina precedente"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </button>
        {showFirst ? (
          <button type="button" className={`${dsBtnNeutral} min-h-9 min-w-9 px-0 text-xs font-semibold`} onClick={() => onPageChange(1)}>
            1
          </button>
        ) : null}
        {showFirstGap ? <span className="px-0.5 text-xs text-zinc-400">…</span> : null}
        {mid.map((p) => (
          <button
            key={p}
            type="button"
            className={`${btn} ${erpFocus} ${p === page ? "border-orange-400 bg-orange-50 text-orange-900 dark:border-orange-600 dark:bg-orange-950/40 dark:text-orange-100" : ""}`}
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        {showLastGap ? <span className="px-0.5 text-xs text-zinc-400">…</span> : null}
        {showLast ? (
          <button
            type="button"
            className={`${dsBtnNeutral} min-h-9 min-w-9 px-0 text-xs font-semibold`}
            onClick={() => onPageChange(pageCount)}
          >
            {pageCount}
          </button>
        ) : null}
        <button
          type="button"
          className={`${btn} ${erpFocus}`}
          aria-label="Pagina successiva"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </button>
        <button
          type="button"
          className={`${btn} ${erpFocus}`}
          aria-label="Ultima pagina"
          disabled={page >= pageCount}
          onClick={() => onPageChange(pageCount)}
        >
          ≫
        </button>
      </nav>
    </div>
  );
}
