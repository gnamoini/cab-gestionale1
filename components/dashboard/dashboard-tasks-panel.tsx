"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { appendDashboardSistemaLog } from "@/lib/dashboard/dashboard-sistema-log-storage";
import { dsBtnPrimary, dsInput, dsTypoSmall } from "@/lib/ui/design-system";
import {
  createDashboardTask,
  DASHBOARD_TASKS_MAX,
  loadDashboardTasks,
  saveDashboardTasks,
  type DashboardTask,
} from "@/lib/dashboard/dashboard-tasks-storage";
import type { GestionaleLogEventTone } from "@/lib/gestionale-log/view-model";

export function DashboardTasksPanel() {
  const { authorName } = useAuth();
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const autore = authorName.trim() || "Operatore";

  function logTask(tone: GestionaleLogEventTone, tipoRiga: string, dettaglio: string) {
    appendDashboardSistemaLog({
      tone,
      tipoRiga: tipoRiga.toUpperCase(),
      oggettoRiga: "Cose da fare",
      modificaRiga: dettaglio,
      autore,
      atIso: new Date().toISOString(),
    });
  }

  useEffect(() => {
    setTasks(loadDashboardTasks());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveDashboardTasks(tasks);
  }, [tasks, ready]);

  function add() {
    if (!draft.trim()) return;
    const t = createDashboardTask(draft);
    setTasks((prev) => [t, ...prev].slice(0, DASHBOARD_TASKS_MAX));
    setDraft("");
    logTask("create", "CREAZIONE", `Nuova nota: ${t.text.slice(0, 200)}`);
  }

  function startEdit(t: DashboardTask) {
    setEditingId(t.id);
    setEditText(t.text);
  }

  function commitEdit(id: string) {
    const next = editText.trim().slice(0, 500);
    if (!next) {
      setEditingId(null);
      return;
    }
    const cur = tasks.find((x) => x.id === id);
    if (cur && cur.text !== next) {
      const a = cur.text.length > 100 ? `${cur.text.slice(0, 100)}…` : cur.text;
      const b = next.length > 100 ? `${next.slice(0, 100)}…` : next;
      logTask("update", "AGGIORNAMENTO", `Modifica testo attività: da «${a}» a «${b}»`);
    }
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, text: next } : x)));
    setEditingId(null);
  }

  return (
    <div className="flex h-full min-h-[140px] flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Aggiungi attività…"
          className={`${dsInput} min-w-0 flex-1 py-2`}
          maxLength={240}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className={`${dsBtnPrimary} shrink-0 px-3 py-2 text-xs`}
        >
          Aggiungi
        </button>
      </div>
      <ul className="gestionale-scrollbar max-h-[168px] space-y-1.5 overflow-y-auto pr-1 text-sm">
        {tasks.length === 0 ? (
          <li className={`rounded-lg border border-dashed border-[color:var(--cab-border)] px-3 py-4 text-center ${dsTypoSmall}`}>
            Nessuna nota. Aggiungi la prima attività.
          </li>
        ) : (
          tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-2 rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] px-2 py-1.5"
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => {
                  setTasks((prev) =>
                    prev.map((x) => {
                      if (x.id !== t.id) return x;
                      const nextDone = !x.done;
                      if (nextDone) {
                        logTask("complete", "COMPLETATA", `Spuntata: ${x.text.slice(0, 200)}`);
                      } else {
                        logTask("update", "AGGIORNAMENTO", `Attività rimessa in corso: ${x.text.slice(0, 200)}`);
                      }
                      return { ...x, done: nextDone };
                    }),
                  );
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[color:var(--cab-border-strong)] text-[color:var(--cab-primary)] focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)]"
                aria-label={t.done ? "Segna come da fare" : "Segna come completata"}
              />
              {editingId === t.id ? (
                <input
                  autoFocus
                  className={`${dsInput} min-w-0 flex-1 py-1.5 text-sm`}
                  value={editText}
                  maxLength={500}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => commitEdit(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitEdit(t.id);
                    }
                    if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={`min-w-0 flex-1 rounded px-1 text-left leading-snug transition hover:bg-[var(--cab-hover)] ${t.done ? "text-[color:var(--cab-text-muted)] line-through" : "text-[color:var(--cab-text)]"}`}
                  onClick={() => startEdit(t)}
                  title="Clic per modificare il testo"
                >
                  {t.text}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm("Eliminare questa attività?")) return;
                  logTask("delete", "ELIMINAZIONE", `Eliminata attività: ${t.text.slice(0, 200)}`);
                  setTasks((prev) => prev.filter((x) => x.id !== t.id));
                  if (editingId === t.id) setEditingId(null);
                }}
                className="shrink-0 rounded p-1 text-xs text-zinc-400 transition hover:bg-zinc-200/80 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                aria-label="Elimina attività"
              >
                ✕
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
