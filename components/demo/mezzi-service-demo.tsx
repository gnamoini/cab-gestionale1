"use client";

import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useMezzoRemoveMutation } from "@/src/hooks/gestionale/use-mezzo-remove-mutation";
import type { MezzoRow } from "@/src/types/supabase-tables";

export function MezziServiceDemo() {
  const q = useMezziListQuery();
  const remove = useMezzoRemoveMutation();

  const rows: MezzoRow[] = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-700">
      <p className="font-semibold text-zinc-900 dark:text-zinc-100">Demo — mezzi (service layer)</p>
      {q.isLoading ? <p className="mt-2 text-zinc-500">Caricamento…</p> : null}
      {q.isError ? <p className="mt-2 text-sm text-red-600">{q.error.message}</p> : null}
      {remove.isError ? <p className="mt-2 text-sm text-red-600">{remove.error.message}</p> : null}
      <ul className="mt-3 max-h-60 space-y-2 overflow-auto">
        {rows.length === 0 && q.isSuccess ? (
          <li className="text-zinc-500">Nessun mezzo.</li>
        ) : (
          rows.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800"
            >
              <span className="min-w-0 truncate text-zinc-800 dark:text-zinc-200">
                <span className="font-medium">{m.marca}</span> {m.modello}
                <span className="ml-2 text-xs text-zinc-500">{m.targa ?? "—"}</span>
              </span>
              <button
                type="button"
                className="shrink-0 rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                disabled={remove.isPending}
                onClick={() => {
                  if (!window.confirm(`Eliminare il mezzo ${m.marca} ${m.modello}?`)) return;
                  void remove.mutateAsync(m.id);
                }}
              >
                Elimina
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
