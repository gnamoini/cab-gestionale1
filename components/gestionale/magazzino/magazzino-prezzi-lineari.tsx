"use client";

import { prezzoNetto } from "@/lib/magazzino/calculations";
import { formatMarkupDisplay } from "@/lib/magazzino/form";

function defaultEur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-3 border-b border-zinc-200/90 py-2 text-sm last:border-b-0 dark:border-zinc-700/90">
      <span className="font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className="text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
    </div>
  );
}

export function MagazzinoPrezziLineari({
  formatEur = defaultEur,
  listinoOE,
  scontoOE,
  listinoAlt,
  scontoAlt,
  markupPct,
  prezzoVendita,
  title = "Prezzi e margini",
}: {
  formatEur?: (n: number) => string;
  listinoOE: number;
  scontoOE: number;
  listinoAlt: number;
  scontoAlt: number;
  markupPct: number;
  prezzoVendita: number;
  title?: string;
}) {
  const nettoOE = prezzoNetto(listinoOE, scontoOE);
  const nettoAlt = prezzoNetto(listinoAlt, scontoAlt);
  const margine = Math.round((prezzoVendita - nettoOE) * 100) / 100;

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/35">
      <p className="mb-1 border-b border-zinc-200/80 pb-2 text-xs font-bold uppercase tracking-wide text-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
        {title}
      </p>
      <Row label="Prezzo originale" value={formatEur(listinoOE)} />
      <Row label="Sconto originale" value={`${scontoOE}%`} />
      <Row label="Netto originale" value={formatEur(nettoOE)} />
      <Row label="Prezzo alternativo" value={formatEur(listinoAlt)} />
      <Row label="Sconto alternativo" value={`${scontoAlt}%`} />
      <Row label="Netto alternativo" value={formatEur(nettoAlt)} />
      <Row label="Prezzo vendita" value={formatEur(prezzoVendita)} />
      <Row label="Markup" value={formatMarkupDisplay(markupPct)} />
      <Row label="Margine (vs netto originale)" value={formatEur(margine)} />
    </div>
  );
}
