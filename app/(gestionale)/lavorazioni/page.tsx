import { Suspense } from "react";
import { LavorazioniView } from "@/components/gestionale/lavorazioni/lavorazioni-view";

export default function LavorazioniPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Caricamento…</div>}>
      <LavorazioniView />
    </Suspense>
  );
}
