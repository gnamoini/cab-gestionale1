"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { SupportoNoteForm } from "@/components/gestionale/supporto/supporto-note-form";
import { SupportoNoteCard } from "@/components/gestionale/supporto/supporto-note-card";
import {
  SupportoNotesFilter,
  type SupportoNotesFilterKey,
} from "@/components/gestionale/supporto/supporto-notes-filter";
import { useAuth } from "@/context/auth-context";
import {
  createSupportoNote,
  loadSupportoNotes,
  saveSupportoNotes,
  type SupportoNote,
} from "@/lib/supporto/supporto-notes-storage";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { dsStackPage } from "@/lib/ui/design-system";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";

export function SupportoView() {
  const { authorName } = useAuth();
  const [notes, setNotes] = useState<SupportoNote[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<SupportoNotesFilterKey>("all");

  useLayoutEffect(() => {
    setNotes(loadSupportoNotes());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSupportoNotes(notes);
  }, [notes, hydrated]);

  const addNote = useCallback(
    (body: string) => {
      const n = createSupportoNote(body, authorName);
      setNotes((prev) => [n, ...prev]);
    },
    [authorName],
  );

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toggleResolved = useCallback((id: string, resolved: boolean) => {
    setNotes((prev) => prev.map((x) => (x.id === id ? { ...x, resolved } : x)));
  }, []);

  const sorted = useMemo(
    () => [...notes].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [notes],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return sorted;
    if (filter === "open") return sorted.filter((n) => !n.resolved);
    return sorted.filter((n) => n.resolved);
  }, [sorted, filter]);

  const listPageSize = useResponsiveListPageSize();
  const notesPagerDeps = useMemo(() => `${filter}|${filtered.length}`, [filter, filtered.length]);
  const {
    page: notesPage,
    setPage: setNotesPage,
    pageCount: notesPageCount,
    sliceItems: sliceNotesPage,
    showPager: showNotesPager,
    label: notesPagerLabel,
    resetPage: resetNotesPage,
  } = useClientPagination(filtered.length, listPageSize);
  useEffect(() => {
    resetNotesPage();
  }, [notesPagerDeps, listPageSize, resetNotesPage]);
  const pagedNotes = useMemo(() => sliceNotesPage(filtered), [filtered, sliceNotesPage]);

  return (
    <>
      <PageHeader title="SUPPORTO" />

      <div className={dsStackPage}>
        <ShellCard>
          <SupportoNoteForm authorName={authorName} onAdd={addNote} disabled={!hydrated} />
        </ShellCard>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SupportoNotesFilter value={filter} onChange={setFilter} />
          <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {filtered.length} {filtered.length === 1 ? "nota" : "note"}
          </p>
        </div>

        <div>
          {!hydrated ? (
            <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Caricamento…
            </p>
          ) : filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {notes.length === 0
                ? "Nessuna nota ancora. Aggiungi la prima segnalazione qui sopra."
                : filter === "open"
                  ? "Nessuna nota aperta con i filtri attuali."
                  : filter === "resolved"
                    ? "Nessuna nota risolta con i filtri attuali."
                    : "Nessuna nota da mostrare."}
            </p>
          ) : (
            <ul className="space-y-3">
              {pagedNotes.map((note) => (
                <SupportoNoteCard key={note.id} note={note} onDelete={deleteNote} onToggleResolved={toggleResolved} />
              ))}
            </ul>
          )}
          {showNotesPager ? (
            <TablePagination
              page={notesPage}
              pageCount={notesPageCount}
              onPageChange={setNotesPage}
              label={notesPagerLabel}
              className="mt-4 rounded-xl border border-zinc-200/90 bg-zinc-50/50 px-2 dark:border-zinc-800 dark:bg-zinc-900/40"
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
