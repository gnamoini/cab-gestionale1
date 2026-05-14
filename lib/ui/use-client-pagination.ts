import { useCallback, useEffect, useMemo, useState } from "react";

/** Default desktop (retrocompatibilità). */
export const CLIENT_PAGE_SIZE = 100;

export type ClientPagination = {
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  pageCount: number;
  sliceItems: <T>(items: T[]) => T[];
  from: number;
  to: number;
  showPager: boolean;
  label: string;
  resetPage: () => void;
};

export function useClientPagination(total: number, pageSize: number = CLIENT_PAGE_SIZE): ClientPagination {
  const size = Math.max(1, pageSize);
  const pageCount = useMemo(() => Math.max(1, Math.ceil(Math.max(0, total) / size)), [total, size]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const showPager = total > size;

  const sliceItems = useCallback(
    <T,>(items: T[]): T[] => {
      if (!showPager) return items;
      const start = (page - 1) * size;
      return items.slice(start, start + size);
    },
    [page, showPager, size],
  );

  const { from, to, label } = useMemo(() => {
    if (total <= 0) {
      return { from: 0, to: 0, label: "Nessun risultato" };
    }
    if (!showPager) {
      return { from: 1, to: total, label: `Mostrando 1–${total} di ${total} risultati` };
    }
    const startIdx = (page - 1) * size;
    const fromN = startIdx + 1;
    const toN = Math.min(page * size, total);
    return {
      from: fromN,
      to: toN,
      label: `Mostrando ${fromN}–${toN} di ${total.toLocaleString("it-IT")} risultati`,
    };
  }, [page, total, showPager, size]);

  const resetPage = useCallback(() => setPage(1), []);

  return { page, setPage, pageCount, sliceItems, from, to, showPager, label, resetPage };
}
