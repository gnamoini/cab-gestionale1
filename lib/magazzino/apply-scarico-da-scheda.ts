import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { dispatchMagazzinoProdottiRefresh } from "@/lib/magazzino/magazzino-prodotti-refresh-event";
import {
  loadMagazzinoChangeLog,
  MAGAZZINO_CHANGE_LOG_MAX,
  saveMagazzinoChangeLog,
  type MagazzinoChangeLogEntry,
} from "@/lib/magazzino/magazzino-change-log-storage";
import { getMagazzinoReportSnapshot, setMagazzinoReportSnapshot } from "@/lib/magazzino/magazzino-report-sync";

export function applyMagazzinoScaricoDaScheda(opts: {
  ricambioId: string;
  quantita: number;
  autore: string;
  riepilogo: string;
}): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: false, error: "Ambiente non disponibile" };
  const qty = Math.round(Number(opts.quantita));
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: "Quantità non valida" };

  const rows = getMagazzinoReportSnapshot();
  const idx = rows.findIndex((r) => r.id === opts.ricambioId);
  if (idx < 0) return { ok: false, error: "Ricambio non trovato nell'anagrafica magazzino" };
  const p = rows[idx]!;
  if (p.scorta < qty) return { ok: false, error: `Scorta insufficiente (disponibili ${p.scorta})` };

  const now = new Date().toISOString();
  const nuovaScorta = p.scorta - qty;
  const nextP = {
    ...p,
    scorta: nuovaScorta,
    dataUltimaModifica: now,
    autoreUltimaModifica: opts.autore.trim() || "Gestionale",
  };
  const next = [...rows];
  next[idx] = nextP;
  setMagazzinoReportSnapshot(next);

  const entry: MagazzinoChangeLogEntry = {
    id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    tipo: "update",
    ricambioId: p.id,
    ricambio: p.descrizione,
    autore: opts.autore.trim() || "Gestionale",
    at: now,
    riepilogo: opts.riepilogo,
    changes: [{ campo: "Scorta", prima: String(p.scorta), dopo: String(nuovaScorta) }],
  };
  const log = loadMagazzinoChangeLog();
  saveMagazzinoChangeLog([entry, ...log].slice(0, MAGAZZINO_CHANGE_LOG_MAX));
  bumpReportDataRefresh();
  dispatchMagazzinoProdottiRefresh();
  return { ok: true };
}
