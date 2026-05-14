import { Suspense } from "react";
import { MagazzinoView } from "@/components/gestionale/magazzino/magazzino-view";

export default function MagazzinoPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Caricamento…</div>}>
      <MagazzinoView />
    </Suspense>
  );
}
