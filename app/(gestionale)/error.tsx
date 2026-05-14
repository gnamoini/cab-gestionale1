"use client";

import { useEffect } from "react";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";

export default function GestionaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[gestionale]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 rounded-xl border border-red-200 bg-red-50/90 p-6 text-red-950 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-50">
      <h1 className="text-base font-semibold">Qualcosa è andato storto</h1>
      <p className="text-sm leading-relaxed opacity-95">
        {error.message?.trim() || "Errore imprevisto nell’area gestionale. Puoi riprovare o tornare alla dashboard."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={erpBtnNeutral} onClick={() => reset()}>
          Riprova
        </button>
        <a href="/dashboard" className={`${erpBtnNeutral} inline-flex no-underline`}>
          Dashboard
        </a>
      </div>
    </div>
  );
}
