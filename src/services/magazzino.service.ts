"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "magazzino_ricambi";

export type MagazzinoFilters = {
  codice?: string;
  nome?: string;
  marca?: string;
};

export type MagazzinoInsert = Omit<MagazzinoRicambioRow, "id" | "created_at" | "updated_at">;
export type MagazzinoUpdate = Partial<MagazzinoInsert>;

async function sb() {
  return getBrowserSupabase();
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const magazzinoService = {
  async getAll(filters?: MagazzinoFilters): Promise<ServiceResult<MagazzinoRicambioRow[]>> {
    try {
      const c = await sb();
      let q = c.from("magazzino_ricambi").select("*").order("codice", { ascending: true });
      if (filters?.codice?.trim()) q = q.ilike("codice", `%${filters.codice.trim()}%`);
      if (filters?.nome?.trim()) q = q.ilike("nome", `%${filters.nome.trim()}%`);
      if (filters?.marca?.trim()) q = q.ilike("marca", `%${filters.marca.trim()}%`);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as MagazzinoRicambioRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<MagazzinoRicambioRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("magazzino_ricambi").select("*").eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Ricambio non trovato");
      return success(data as MagazzinoRicambioRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: MagazzinoInsert): Promise<ServiceResult<MagazzinoRicambioRow>> {
    try {
      const c = await sb();
      const { data: row, error } = await c.from("magazzino_ricambi").insert(data).select("*").single();
      if (error) return err(error.message);
      const r = row as MagazzinoRicambioRow;
      await writeModificaLog(c, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r) });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: MagazzinoUpdate): Promise<ServiceResult<MagazzinoRicambioRow>> {
    try {
      const c = await sb();
      const { data: before, error: e0 } = await c.from("magazzino_ricambi").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      const { data: row, error } = await c.from("magazzino_ricambi").update(data).eq("id", id).select("*").single();
      if (error) return err(error.message);
      const r = row as MagazzinoRicambioRow;
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
      const { data: existing, error: e0 } = await c.from("magazzino_ricambi").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (existing) await writeModificaLog(c, { entita: ENTITA, entita_id: id, azione: "DELETE", payload: auditSnapshot(existing) });
      const { error } = await c.from("magazzino_ricambi").delete().eq("id", id);
      if (error) return err(error.message);
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /**
   * Stima `consumo_medio_mensile` dalle uscite degli ultimi `windowMonths` mesi (somma uscite / mesi).
   * Aggiorna la riga magazzino e registra audit come update standard.
   */
  async ricalcolaConsumoMedioMensile(
    id: string,
    windowMonths = 3,
  ): Promise<ServiceResult<MagazzinoRicambioRow>> {
    try {
      const c = await sb();
      const since = new Date();
      since.setMonth(since.getMonth() - Math.max(1, Math.min(windowMonths, 24)));
      const { data: movs, error: eM } = await c
        .from("movimenti_ricambi")
        .select("quantita")
        .eq("ricambio_id", id)
        .eq("tipo", "uscita")
        .gte("created_at", since.toISOString());
      if (eM) return err(eM.message);
      const sum = (movs ?? []).reduce((s, m) => s + num((m as { quantita: unknown }).quantita), 0);
      const months = Math.max(1, Math.min(windowMonths, 24));
      const mensile = Math.round((sum / months) * 1000) / 1000;
      return magazzinoService.update(id, { consumo_medio_mensile: mensile });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
