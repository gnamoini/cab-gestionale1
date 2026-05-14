import type { GestionaleLogEventTone, GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { dispatchDashboardSistemaLogRefresh } from "@/lib/sistema/cab-events";

export const DASHBOARD_SISTEMA_LOG_STORAGE_KEY = "gestionale-dashboard-sistema-log-v1";
export const DASHBOARD_SISTEMA_LOG_MAX = 400;

export type DashboardSistemaLogStored = GestionaleLogViewModel & { id: string };

function nextId(): string {
  return `dslog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadDashboardSistemaLog(): DashboardSistemaLogStored[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DASHBOARD_SISTEMA_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: DashboardSistemaLogStored[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : nextId();
      const tipoRiga = typeof o.tipoRiga === "string" ? o.tipoRiga : "";
      const oggettoRiga = typeof o.oggettoRiga === "string" ? o.oggettoRiga : "";
      const modificaRiga = typeof o.modificaRiga === "string" ? o.modificaRiga : "";
      const autore = typeof o.autore === "string" && o.autore.trim() ? o.autore.trim() : "Sistema";
      const atIso = typeof o.atIso === "string" && o.atIso.trim() ? o.atIso.trim() : new Date().toISOString();
      const tone = (typeof o.tone === "string" ? o.tone : "neutral") as GestionaleLogEventTone;
      if (!tipoRiga || !oggettoRiga) continue;
      out.push({ id, tipoRiga, oggettoRiga, modificaRiga, autore, atIso, tone });
    }
    return out.slice(0, DASHBOARD_SISTEMA_LOG_MAX);
  } catch {
    return [];
  }
}

export function saveDashboardSistemaLog(entries: DashboardSistemaLogStored[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DASHBOARD_SISTEMA_LOG_STORAGE_KEY, JSON.stringify(entries.slice(0, DASHBOARD_SISTEMA_LOG_MAX)));
    bumpReportDataRefresh();
  } catch {
    /* ignore quota */
  }
}

export function removeDashboardSistemaLogEntryById(id: string): void {
  const next = loadDashboardSistemaLog().filter((e) => e.id !== id);
  saveDashboardSistemaLog(next);
  dispatchDashboardSistemaLogRefresh();
}
export function appendDashboardSistemaLog(entry: GestionaleLogViewModel): void {
  const prev = loadDashboardSistemaLog();
  const row: DashboardSistemaLogStored = { ...entry, id: nextId() };
  const last = prev[0];
  if (
    last &&
    last.tipoRiga === row.tipoRiga &&
    last.oggettoRiga === row.oggettoRiga &&
    last.modificaRiga === row.modificaRiga &&
    last.autore === row.autore &&
    Math.abs(new Date(row.atIso).getTime() - new Date(last.atIso).getTime()) < 900
  ) {
    return;
  }
  saveDashboardSistemaLog([row, ...prev]);
  dispatchDashboardSistemaLogRefresh();
}
