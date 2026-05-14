"use client";

import type { SupportoNote } from "@/lib/supporto/supporto-notes-storage";
import { formatSupportoNoteDateTime } from "@/lib/supporto/supporto-notes-format";
import { dsBadgeOk, dsBtnIcon } from "@/lib/ui/design-system";

export function SupportoNoteCard({
  note,
  onDelete,
  onToggleResolved,
}: {
  note: SupportoNote;
  onDelete: (id: string) => void;
  onToggleResolved: (id: string, resolved: boolean) => void;
}) {
  const authorDisplay = note.autore.trim().toUpperCase();

  function handleDelete() {
    if (!window.confirm("Eliminare questa nota?")) return;
    onDelete(note.id);
  }

  return (
    <li>
      <article
        className={`rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition-[border-color,box-shadow,background-color] duration-150 hover:border-zinc-300/90 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-600 ${
          note.resolved ? "opacity-90" : ""
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-sm font-bold tracking-wide text-orange-700 dark:text-orange-300">[{authorDisplay}]</p>
              {note.resolved ? (
                <span className={dsBadgeOk} title="Segnalazione risolta">
                  Risolta
                </span>
              ) : null}
            </div>
            <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{formatSupportoNoteDateTime(note.at)}</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">
              {note.body}
            </p>
          </div>
          <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end">
            <label className="flex cursor-pointer items-center gap-2 rounded-md text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-600 dark:bg-zinc-900"
                checked={note.resolved}
                onChange={(e) => onToggleResolved(note.id, e.target.checked)}
                aria-label="Segna come risolta"
              />
              <span>Risolta</span>
            </label>
            <button
              type="button"
              onClick={handleDelete}
              className={`${dsBtnIcon} text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400`}
              title="Elimina nota"
              aria-label="Elimina nota"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}
