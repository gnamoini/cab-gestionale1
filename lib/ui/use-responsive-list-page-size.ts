"use client";

import { useEffect, useState } from "react";

/** Allineato a Tailwind `sm` / `lg` (mobile-first). */
export const LIST_PAGE_MOBILE = 25;
export const LIST_PAGE_TABLET = 50;
export const LIST_PAGE_DESKTOP = 100;

/**
 * Dimensione pagina elenchi: 25 (≤639px), 50 (640–1023px), 100 (≥1024px).
 */
export function useResponsiveListPageSize(): number {
  const [pageSize, setPageSize] = useState(LIST_PAGE_DESKTOP);

  useEffect(() => {
    const mqMobile = window.matchMedia("(max-width: 639px)");
    const mqTablet = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      if (mqMobile.matches) setPageSize(LIST_PAGE_MOBILE);
      else if (mqTablet.matches) setPageSize(LIST_PAGE_TABLET);
      else setPageSize(LIST_PAGE_DESKTOP);
    };
    apply();
    mqMobile.addEventListener("change", apply);
    mqTablet.addEventListener("change", apply);
    return () => {
      mqMobile.removeEventListener("change", apply);
      mqTablet.removeEventListener("change", apply);
    };
  }, []);

  return pageSize;
}
