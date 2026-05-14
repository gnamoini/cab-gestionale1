"use client";

import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import type { ServiceResult } from "@/src/services/service-result";

export type UseServiceMutationOptions<TData, TVariables = void> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  "mutationFn"
> & {
  /**
   * Dopo `onSettled`, invalida i gruppi indicati (stesso contratto di `queryKey` in React Query).
   * Mantiene i componenti liberi da import diretti `@tanstack/react-query`.
   */
  invalidateQueryKeys?: readonly (readonly unknown[])[];
};

/**
 * Mutation che usa un service: in caso di `success: false` lancia `Error`
 * così React Query popola `isError` / `error` in modo uniforme.
 */
export function useServiceMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<ServiceResult<TData>>,
  options?: UseServiceMutationOptions<TData, TVariables>,
) {
  const queryClient = useQueryClient();
  const { invalidateQueryKeys, onSettled, ...rest } = options ?? {};
  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const res = await mutationFn(variables);
      if (!res.success) throw new Error(res.error ?? "Operazione fallita");
      return res.data as TData;
    },
    ...rest,
    onSettled: async (data, error, variables, onMutateResult, context) => {
      await onSettled?.(data, error, variables, onMutateResult, context);
      if (invalidateQueryKeys?.length) {
        await Promise.all(
          invalidateQueryKeys.map((qk) => queryClient.invalidateQueries({ queryKey: qk as unknown[] })),
        );
      }
    },
  });
}
