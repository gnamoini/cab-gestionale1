"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { SchedaLavorazioneRow, TipoSchedaLavorazione } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "scheda_lavorazione";

export type SchedaFilters = {
  lavorazione_id?: string;
  tipo?: TipoSchedaLavorazione;
};

export type SchedaInsert = Omit<SchedaLavorazioneRow, "id" | "created_at" | "updated_at">;
export type SchedaUpdate = Partial<Pick<SchedaLavorazioneRow, "tipo" | "contenuto">>;

async function sb() {
  return getBrowserSupabase();
}

export const schedeService = {
  async getAll(filters?: SchedaFilters): Promise<ServiceResult<SchedaLavorazioneRow[]>> {
    try {
      const c = await sb();
      let q = c.from("scheda_lavorazione").select("*").order("created_at", { ascending: false });
      if (filters?.lavorazione_id) q = q.eq("lavorazione_id", filters.lavorazione_id);
      if (filters?.tipo) q = q.eq("tipo", filters.tipo);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as SchedaLavorazioneRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<SchedaLavorazioneRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("scheda_lavorazione").select("*").eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Scheda non trovata");
      return success(data as SchedaLavorazioneRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: SchedaInsert): Promise<ServiceResult<SchedaLavorazioneRow>> {
    try {
      const c = await sb();
      const { data: row, error } = await c.from("scheda_lavorazione").insert(data).select("*").single();
      if (error) return err(error.message);
      const r = row as SchedaLavorazioneRow;
      await writeModificaLog(c, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r) });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: SchedaUpdate): Promise<ServiceResult<SchedaLavorazioneRow>> {
    try {
      const c = await sb();
      const { data: before, error: e0 } = await c.from("scheda_lavorazione").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      const { data: row, error } = await c.from("scheda_lavorazione").update(data).eq("id", id).select("*").single();
      if (error) return err(error.message);
      const r = row as SchedaLavorazioneRow;
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
      const { data: existing, error: e0 } = await c.from("scheda_lavorazione").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (existing) await writeModificaLog(c, { entita: ENTITA, entita_id: id, azione: "DELETE", payload: auditSnapshot(existing) });
      const { error } = await c.from("scheda_lavorazione").delete().eq("id", id);
      if (error) return err(error.message);
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
