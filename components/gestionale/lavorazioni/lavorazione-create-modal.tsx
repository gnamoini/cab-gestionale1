"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioneCreateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { LAVORAZIONI_STATI_IN_CORSO } from "@/src/services/lavorazioni.service";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsInput, dsLabel } from "@/lib/ui/design-system";

const PRIORITA_OPTS: PrioritaLavorazione[] = ["bassa", "media", "alta", "urgente"];

function ymdToIsoMidUtc(ymd: string): string {
  const p = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return new Date().toISOString();
  const [y, m, d] = p.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date().toISOString();
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)).toISOString();
}

function todayYmd(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function LavorazioneCreateModal({
  open,
  onClose,
  defaultMezzoId,
  createdBy,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultMezzoId?: string | null;
  createdBy: string | null;
  onCreated?: (id: string) => void;
}) {
  const mezziQ = useMezziListQuery(undefined, { enabled: open, staleTime: 30_000 });
  const create = useLavorazioneCreateMutation();

  const [mezzoId, setMezzoId] = useState("");
  const [stato, setStato] = useState<StatoLavorazione>("bozza");
  const [priorita, setPriorita] = useState<PrioritaLavorazione>("media");
  const [ingressoYmd, setIngressoYmd] = useState(todayYmd);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setMezzoId((defaultMezzoId ?? "").trim());
    setStato("bozza");
    setPriorita("media");
    setIngressoYmd(todayYmd());
    setNote("");
  }, [open, defaultMezzoId]);

  const mezziOpts = useMemo(() => {
    const rows = mezziQ.data ?? [];
    return [...rows].sort((a, b) => `${a.marca} ${a.modello}`.localeCompare(`${b.marca} ${b.modello}`, "it"));
  }, [mezziQ.data]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const mid = mezzoId.trim();
    if (!createdBy) {
      window.alert("Devi essere autenticato per creare una lavorazione.");
      return;
    }
    try {
      const row = await create.mutateAsync({
        mezzo_id: mid,
        stato,
        priorita,
        data_ingresso: ymdToIsoMidUtc(ingressoYmd),
        data_uscita: null,
        note: note.trim() || null,
        created_by: createdBy,
      });
      onCreated?.(row.id);
      onClose();
    } catch {
      /* errore mostrato sotto */
    }
  }

  return (
    <LavorazioniModalShell wide onRequestClose={onClose}>
      <form onSubmit={onSubmit} className="flex max-h-[min(88dvh,720px)] flex-col overflow-hidden">
        <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nuova lavorazione</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Dati salvati su database (nessun mock).</p>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {mezziQ.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{mezziQ.error?.message ?? "Errore caricamento mezzi."}</p>
          ) : null}
          {create.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{create.error?.message ?? "Creazione fallita."}</p>
          ) : null}

          <label className="block">
            <span className={dsLabel}>Mezzo</span>
            <select
              className={`${dsInput} mt-1 w-full`}
              value={mezzoId}
              onChange={(e) => setMezzoId(e.target.value)}
              required
              disabled={mezziQ.isLoading || create.isPending}
            >
              <option value="">— Seleziona —</option>
              {mezziOpts.map((m) => (
                <option key={m.id} value={m.id}>
                  {`${m.marca} ${m.modello}`.trim()} · {m.matricola}
                  {m.targa?.trim() ? ` · ${m.targa}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={dsLabel}>Stato iniziale</span>
              <select
                className={`${dsInput} mt-1 w-full capitalize`}
                value={stato}
                onChange={(e) => setStato(e.target.value as StatoLavorazione)}
                disabled={create.isPending}
              >
                {LAVORAZIONI_STATI_IN_CORSO.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={dsLabel}>Priorità</span>
              <select
                className={`${dsInput} mt-1 w-full capitalize`}
                value={priorita}
                onChange={(e) => setPriorita(e.target.value as PrioritaLavorazione)}
                disabled={create.isPending}
              >
                {PRIORITA_OPTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className={dsLabel}>Data ingresso</span>
            <input
              type="date"
              className={`${dsInput} mt-1 w-full`}
              value={ingressoYmd}
              onChange={(e) => setIngressoYmd(e.target.value)}
              disabled={create.isPending}
              required
            />
          </label>

          <label className="block">
            <span className={dsLabel}>Note</span>
            <textarea className={`${dsInput} mt-1 min-h-[88px] w-full resize-y`} value={note} onChange={(e) => setNote(e.target.value)} disabled={create.isPending} rows={3} />
          </label>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="button" className={erpBtnNeutral} onClick={onClose} disabled={create.isPending}>
            Annulla
          </button>
          <button type="submit" className={erpBtnAccent} disabled={create.isPending || mezziQ.isLoading || !createdBy}>
            {create.isPending ? "Salvataggio…" : "Crea lavorazione"}
          </button>
        </footer>
      </form>
    </LavorazioniModalShell>
  );
}
