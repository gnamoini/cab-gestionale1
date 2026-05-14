"use client";

import type { SchedaStatoUi } from "@/types/schede";
import { dsBadgeInfo, dsBadgeNeutral, dsBadgeOk, dsBadgeWarn } from "@/lib/ui/design-system";

export function SchedaStatoBadge({ stato }: { stato: SchedaStatoUi }) {
  const cls =
    stato === "mancante"
      ? dsBadgeNeutral
      : stato === "creata"
        ? dsBadgeInfo
        : stato === "caricata"
          ? dsBadgeWarn
          : stato === "aggiornata"
            ? dsBadgeOk
            : dsBadgeNeutral;
  const label =
    stato === "mancante"
      ? "Mancante"
      : stato === "creata"
        ? "Creata"
        : stato === "caricata"
          ? "File esterno"
          : stato === "aggiornata"
            ? "Aggiornata"
            : stato;
  return <span className={cls}>{label}</span>;
}

export function FileEsternoBadge() {
  return <span className={dsBadgeWarn}>File esterno</span>;
}
