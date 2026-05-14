"use client";

import { useEffect } from "react";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md rounded-xl border border-red-200 bg-red-50/90 p-6 text-red-950 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-50">
        <h1 className="text-lg font-semibold">Errore applicazione</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-95">
          {error.message?.trim() || "Si è verificato un errore. Riprova tra qualche istante."}
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-red-300/60 bg-white px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100/80 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100 dark:hover:bg-red-900/40"
          onClick={() => reset()}
        >
          Riprova
        </button>
      </div>
    </div>
  );
}
