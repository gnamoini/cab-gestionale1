"use client";

import { useCallback, useState } from "react";
import { dsBtnPrimary, dsLabel, dsTextarea } from "@/lib/ui/design-system";

export function SupportoNoteForm({
  authorName,
  onAdd,
  disabled,
}: {
  authorName: string;
  onAdd: (body: string) => void;
  disabled?: boolean;
}) {
  const [body, setBody] = useState("");

  const submit = useCallback(() => {
    const t = body.trim();
    if (!t || disabled) return;
    onAdd(t);
    setBody("");
  }, [body, disabled, onAdd]);

  return (
    <div className="flex flex-col gap-3">
      <label className={`block ${dsLabel}`}>
        Nota
        <textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Segnala un problema, un’idea, un promemoria o un miglioramento…"
          disabled={disabled}
          className={`mt-1.5 ${dsTextarea}`}
          aria-label="Testo nota"
        />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Autore: <span className="font-semibold text-zinc-700 dark:text-zinc-200">{authorName}</span>
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !body.trim()}
          className={`${dsBtnPrimary} w-full justify-center sm:w-auto`}
        >
          Aggiungi
        </button>
      </div>
    </div>
  );
}
