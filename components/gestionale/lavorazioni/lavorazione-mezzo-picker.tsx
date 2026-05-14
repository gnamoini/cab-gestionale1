"use client";

import { useMemo, useState } from "react";
import { formatIdentificazioneMezzoLine, mezzoMatchesSmartQuery, type MezzoIdentificazioneParts } from "@/lib/mezzi/identificazione-mezzo";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { dsBtnNeutral, dsInput } from "@/lib/ui/design-system";

function summarizeMezzo(m: MezzoGestito): string {
  const parts: MezzoIdentificazioneParts = {
    targa: m.targa,
    matricola: m.matricola,
    nScuderia: m.numeroScuderia,
    marcaAttrezzatura: m.marca,
    modelloAttrezzatura: m.modello,
    cliente: m.cliente,
    utilizzatore: m.utilizzatore,
  };
  return formatIdentificazioneMezzoLine(parts);
}

export function LavorazioneMezzoPicker({
  mezzi,
  draft,
  setDraft,
}: {
  mezzi: MezzoGestito[];
  draft: LavorazioneAttiva;
  setDraft: (next: Partial<LavorazioneAttiva>) => void;
}) {
  const [q, setQ] = useState("");
  const [manual, setManual] = useState(false);

  const filtered = useMemo(() => {
    const list = mezzi.filter((m) => mezzoMatchesSmartQuery(m, q));
    return list.slice(0, 24);
  }, [mezzi, q]);

  function applyMezzo(m: MezzoGestito) {
    setManual(false);
    setDraft({
      macchina: `${m.marca} ${m.modello}`.trim(),
      targa: m.targa,
      matricola: m.matricola,
      nScuderia: m.numeroScuderia?.trim() ?? "",
      cliente: m.cliente,
      utilizzatore: m.utilizzatore ?? "",
    });
    setQ(`${m.targa} ${m.matricola}`.trim());
  }

  function goManual() {
    setManual(true);
    setQ("");
  }

  return (
    <div className="rounded-lg border border-zinc-100 bg-white/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Mezzo in archivio</p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Cerca per targa, matricola, scuderia, cliente, marca o modello. Seleziona per compilare i campi, oppure inserisci una nuova macchina manualmente.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          className={`${dsInput} min-w-[12rem] flex-1 !text-sm`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca mezzo…"
          disabled={manual}
        />
        <button type="button" className={`${dsBtnNeutral} shrink-0 text-xs`} onClick={goManual}>
          + Nuova macchina manuale
        </button>
      </div>
      {!manual && q.trim() ? (
        <ul className="gestionale-scrollbar mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-1.5 dark:border-zinc-700 dark:bg-zinc-800/50">
          {filtered.length === 0 ? (
            <li className="px-2 py-2 text-xs text-zinc-500">Nessun mezzo corrispondente.</li>
          ) : (
            filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-orange-500/10 dark:hover:bg-orange-950/40"
                  onClick={() => applyMezzo(m)}
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{summarizeMezzo(m)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      {manual ? (
        <p className="mt-2 text-[11px] font-medium text-orange-700 dark:text-orange-300">Modalità manuale: compila i campi sottostanti.</p>
      ) : null}
    </div>
  );
}
