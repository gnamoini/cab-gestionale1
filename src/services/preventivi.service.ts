"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { PreventivoRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "preventivi";

export type PreventiviFilters = {
  mezzo_id?: string;
  cliente?: string;
  lavorazione_id?: string;
};

export type PreventivoInsert = Omit<PreventivoRow, "id" | "created_at" | "updated_at">;
export type PreventivoUpdate = Partial<PreventivoInsert>;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Deriva un totale da `dettagli` se presente struttura con righe o campo totale. */
export function preventiviInferTotaleDaDettagli(dettagli: Record<string, unknown>): number {
  const righe = dettagli.righe;
  if (Array.isArray(righe)) {
    return righe.reduce((sum, r) => {
      if (r && typeof r === "object" && "importo" in r) return sum + num((r as { importo: unknown }).importo);
      return sum;
    }, 0);
  }
  if (typeof dettagli.totale === "number") return dettagli.totale;
  if (typeof dettagli.totale === "string") return num(dettagli.totale);
  return 0;
}

function mergePreventivoPayload(data: PreventivoInsert | PreventivoUpdate): PreventivoInsert | PreventivoUpdate {
  const hasDettagli = "dettagli" in data && data.dettagli != null;
  if (!hasDettagli) return data;
  const dettagli = data.dettagli as Record<string, unknown>;
  const tot =
    "totale" in data && data.totale != null
      ? num(data.totale)
      : preventiviInferTotaleDaDettagli(dettagli);
  return { ...data, dettagli, totale: tot };
}

async function sb() {
  return getBrowserSupabase();
}

export const preventiviService = {
  async getAll(filters?: PreventiviFilters): Promise<ServiceResult<PreventivoRow[]>> {
    try {
      const c = await sb();
      let q = c.from("preventivi").select("*").order("created_at", { ascending: false });
      if (filters?.mezzo_id) q = q.eq("mezzo_id", filters.mezzo_id);
      if (filters?.lavorazione_id) q = q.eq("lavorazione_id", filters.lavorazione_id);
      if (filters?.cliente?.trim()) q = q.ilike("cliente", `%${filters.cliente.trim()}%`);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as PreventivoRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<PreventivoRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("preventivi").select("*").eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Preventivo non trovato");
      return success(data as PreventivoRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: PreventivoInsert): Promise<ServiceResult<PreventivoRow>> {
    try {
      const c = await sb();
      const merged = mergePreventivoPayload(data) as PreventivoInsert;
      const { data: row, error } = await c.from("preventivi").insert(merged).select("*").single();
      if (error) return err(error.message);
      const r = row as PreventivoRow;
      await writeModificaLog(c, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r) });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: PreventivoUpdate): Promise<ServiceResult<PreventivoRow>> {
    try {
      const c = await sb();
      const { data: before, error: e0 } = await c.from("preventivi").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      const base = { ...(before as PreventivoRow), ...data };
      const merged =
        data.dettagli !== undefined ? (mergePreventivoPayload(base) as PreventivoRow) : base;
      const { data: row, error } = await c.from("preventivi").update(merged).eq("id", id).select("*").single();
      if (error) return err(error.message);
      const r = row as PreventivoRow;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async remove(id: string): Promise<ServiceResult<null>> {
    try {
      const c = await sb();
      const { data: existing, error: e0 } = await c.from("preventivi").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (existing) await writeModificaLog(c, { entita: ENTITA, entita_id: id, azione: "DELETE", payload: auditSnapshot(existing) });
      const { error } = await c.from("preventivi").delete().eq("id", id);
      if (error) return err(error.message);
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
