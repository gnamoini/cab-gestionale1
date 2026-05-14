"use client";

import type { QueryClient } from "@tanstack/react-query";

export const QK = {
  profiles: ["profiles"] as const,
  mezzi: ["mezzi"] as const,
  mezzoQueries: ["mezzoQueries"] as const,
  lavorazioniQueries: ["lavorazioniQueries"] as const,
  schede: ["schede"] as const,
  magazzino: ["magazzino"] as const,
  movimenti: ["movimenti"] as const,
  preventivi: ["preventivi"] as const,
  documenti: ["documenti"] as const,
  log: ["log_modifiche"] as const,
};

export async function invalidateAfterMezzoMutations(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: QK.mezzi }),
    qc.invalidateQueries({ queryKey: QK.mezzoQueries }),
    qc.invalidateQueries({ queryKey: QK.lavorazioniQueries }),
    qc.invalidateQueries({ queryKey: QK.preventivi }),
    qc.invalidateQueries({ queryKey: QK.documenti }),
    qc.invalidateQueries({ queryKey: QK.log }),
  ]);
}

export async function invalidateAfterLavorazioneMutations(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: QK.mezzoQueries }),
    qc.invalidateQueries({ queryKey: QK.lavorazioniQueries }),
    qc.invalidateQueries({ queryKey: QK.schede }),
    qc.invalidateQueries({ queryKey: QK.movimenti }),
    qc.invalidateQueries({ queryKey: QK.preventivi }),
    qc.invalidateQueries({ queryKey: QK.documenti }),
    qc.invalidateQueries({ queryKey: QK.log }),
  ]);
}

export async function invalidateAfterMagazzinoOrMovimenti(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: QK.mezzoQueries }),
    qc.invalidateQueries({ queryKey: QK.lavorazioniQueries }),
    qc.invalidateQueries({ queryKey: QK.magazzino }),
    qc.invalidateQueries({ queryKey: QK.movimenti }),
  ]);
}
