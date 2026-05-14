"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { useLavorazioneUpdateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsInput, dsLabel } from "@/lib/ui/design-system";

function isoToYmd(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdToIsoMidUtc(ymd: string): string {
  const p = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return new Date().toISOString();
  const [y, m, d] = p.split("-").map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)).toISOString();
}

export function LavorazioneEditModal({
  row,
  onClose,
}: {
  row: LavorazioneListRow;
  onClose: () => void;
}) {
  const update = useLavorazioneUpdateMutation();
  const [note, setNote] = useState("");
  const [ingressoYmd, setIngressoYmd] = useState("");

  useEffect(() => {
    setNote((row.note ?? "").trim());
    setIngressoYmd(isoToYmd(row.data_ingresso ?? row.created_at) || "");
  }, [row.id, row.note, row.data_ingresso, row.created_at]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ingressoYmd.trim()) {
      window.alert("Data ingresso obbligatoria.");
      return;
    }
    try {
      await update.mutateAsync({
        id: row.id,
        data: {
          note: note.trim() || null,
          data_ingresso: ymdToIsoMidUtc(ingressoYmd),
        },
      });
      onClose();
    } catch {
      /* mostrato sotto */
    }
  }

  return (
    <LavorazioniModalShell onRequestClose={onClose}>
      <form onSubmit={onSubmit} className="flex max-h-[min(88dvh,560px)] flex-col overflow-hidden">
        <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Modifica lavorazione</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">ID: {row.id}</p>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {update.isError ? <p className="text-sm text-red-600 dark:text-red-400">{update.error?.message ?? "Aggiornamento fallito."}</p> : null}

          <label className="block">
            <span className={dsLabel}>Data ingresso</span>
            <input type="date" className={`${dsInput} mt-1 w-full`} value={ingressoYmd} onChange={(e) => setIngressoYmd(e.target.value)} disabled={update.isPending} required />
          </label>

          <label className="block">
            <span className={dsLabel}>Note</span>
            <textarea className={`${dsInput} mt-1 min-h-[100px] w-full resize-y`} value={note} onChange={(e) => setNote(e.target.value)} disabled={update.isPending} rows={4} />
          </label>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="button" className={erpBtnNeutral} onClick={onClose} disabled={update.isPending}>
            Annulla
          </button>
          <button type="submit" className={erpBtnAccent} disabled={update.isPending}>
            {update.isPending ? "Salvataggio…" : "Salva"}
          </button>
        </footer>
      </form>
    </LavorazioniModalShell>
  );
}
