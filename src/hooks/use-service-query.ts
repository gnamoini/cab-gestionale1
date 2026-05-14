"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { ServiceResult } from "@/src/services/service-result";

export function useServiceQuery<TData, TKey extends readonly unknown[]>(
  queryKey: TKey,
  queryFn: () => Promise<ServiceResult<TData>>,
  options?: Omit<UseQueryOptions<TData, Error, TData, TKey>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const res = await queryFn();
      if (!res.success) throw new Error(res.error ?? "Errore servizio");
      return res.data as TData;
    },
    ...options,
  });
}
