"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";

type PaginatedListProps<T> = {
  items: readonly T[];
  /** Cambia quando filtri/ordinamento/ricerca cambiano (reset a pagina 1). */
  depsKey: string;
  children: (pageItems: T[]) => ReactNode;
  /** Classi aggiuntive sul wrapper della barra paginazione. */
  paginationClassName?: string;
};

/**
 * Slice client-side + barra paginazione coerente (100 / 50 / 25 per breakpoint).
 */
export function PaginatedList<T>({ items, depsKey, children, paginationClassName }: PaginatedListProps<T>) {
  const pageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(items.length, pageSize);

  useEffect(() => {
    resetPage();
  }, [depsKey, resetPage]);

  const pageItems = useMemo(() => sliceItems([...items]), [items, sliceItems, page]);

  return (
    <>
      {children(pageItems)}
      {showPager ? (
        <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} className={paginationClassName} />
      ) : null}
    </>
  );
}
