"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneRow, MezzoRow, PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "lavorazioni";

/** Stati considerati «in corso». */
export const LAVORAZIONI_STATI_IN_CORSO: StatoLavorazione[] = ["bozza", "in_coda", "in_officina", "in_attesa_ricambi"];

/** Stati chiusi / archivio. */
export const LAVORAZIONI_STATI_CHIUSE: StatoLavorazione[] = ["completata", "consegnata", "annullata"];

export type LavorazioneListRow = LavorazioneRow & { mezzo: MezzoRow | null };

export type LavorazioneFilters = {
  /** Se valorizzato, filtra `stato` con `IN` (insieme esplicito). */
  stati_in?: StatoLavorazione[];
  mezzo_id?: string;
  stato?: StatoLavorazione;
  priorita?: PrioritaLavorazione;
  /** Se true, include join `mezzi` (relazione su mezzo_id). */
  includeMezzo?: boolean;
  /** Contenuto in `note` (case-insensitive). */
  search?: string;
  /** Range opzionale su `data_ingresso` (ISO `yyyy-mm-dd` o timestamp completo). */
  data_ingresso_da?: string;
  data_ingresso_a?: string;
  /** Range opzionale su `data_uscita`. */
  data_uscita_da?: string;
  data_uscita_a?: string;
};

export type LavorazioneInsert = Omit<LavorazioneRow, "id" | "created_at" | "updated_at">;
export type LavorazioneUpdate = Partial<LavorazioneInsert>;

function embedMezzo(raw: unknown): MezzoRow | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return (raw[0] as MezzoRow) ?? null;
  return raw as MezzoRow;
}

async function c() {
  return getBrowserSupabase();
}

function escapeIlikeToken(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function endOfDayIso(dateDay: string): string {
  const t = dateDay.trim();
  if (!t) return t;
  return t.length <= 10 ? `${t}T23:59:59.999Z` : t;
}

/** Filtri server-side condivisi tra query con/senza join `mezzi`. */
function applyLavorazioniListFilters(q: any, filters?: LavorazioneFilters) {
  if (!filters) return q;
  if (filters.stati_in?.length) q = q.in("stato", filters.stati_in);
  if (filters.mezzo_id) q = q.eq("mezzo_id", filters.mezzo_id);
  if (filters.stato) q = q.eq("stato", filters.stato);
  if (filters.priorita) q = q.eq("priorita", filters.priorita);
  const search = filters.search?.trim();
  if (search) q = q.ilike("note", `%${escapeIlikeToken(search)}%`);
  if (filters.data_ingresso_da?.trim()) q = q.gte("data_ingresso", filters.data_ingresso_da.trim());
  if (filters.data_ingresso_a?.trim()) q = q.lte("data_ingresso", endOfDayIso(filters.data_ingresso_a));
  if (filters.data_uscita_da?.trim()) q = q.gte("data_uscita", filters.data_uscita_da.trim());
  if (filters.data_uscita_a?.trim()) q = q.lte("data_uscita", endOfDayIso(filters.data_uscita_a));
  return q;
}

export const lavorazioniService = {
  async getAll(filters?: LavorazioneFilters): Promise<ServiceResult<LavorazioneListRow[]>> {
    try {
      const sb = await c();
      if (filters?.includeMezzo) {
        let q = sb.from("lavorazioni").select("*, mezzi(*)").order("created_at", { ascending: false });
        q = applyLavorazioniListFilters(q, filters);
        const { data, error } = await q;
        if (error) return err(error.message);
        const raw = (data ?? []) as Array<LavorazioneRow & { mezzi?: unknown }>;
        const rows: LavorazioneListRow[] = raw.map((row) => {
          const { mezzi: em, ...rest } = row;
          return { ...(rest as LavorazioneRow), mezzo: embedMezzo(em) };
        });
        return success(rows);
      }

      let q = sb.from("lavorazioni").select("*").order("created_at", { ascending: false });
      q = applyLavorazioniListFilters(q, filters);
      const { data, error } = await q;
      if (error) return err(error.message);
      const raw = (data ?? []) as LavorazioneRow[];
      const rows: LavorazioneListRow[] = raw.map((row) => ({ ...row, mezzo: null }));
      return success(rows);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<LavorazioneRow>> {
    try {
      const sb = await c();
      const { data, error } = await sb.from("lavorazioni").select("*").eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Lavorazione non trovata");
      return success(data as LavorazioneRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: LavorazioneInsert): Promise<ServiceResult<LavorazioneRow>> {
    try {
      const sb = await c();
      const { data: row, error } = await sb.from("lavorazioni").insert(data).select("*").single();
      if (error) return err(error.message);
      const r = row as LavorazioneRow;
      await writeModificaLog(sb, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r) });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: LavorazioneUpdate): Promise<ServiceResult<LavorazioneRow>> {
    try {
      const sb = await c();
      const { data: before, error: e0 } = await sb.from("lavorazioni").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      const { data: row, error } = await sb.from("lavorazioni").update(data).eq("id", id).select("*").single();
      if (error) return err(error.message);
      const r = row as LavorazioneRow;
      await writeModificaLog(sb, {
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
      const sb = await c();
      const { data: existing, error: e0 } = await sb.from("lavorazioni").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (existing) await writeModificaLog(sb, { entita: ENTITA, entita_id: id, azione: "DELETE", payload: auditSnapshot(existing) });
      const { error } = await sb.from("lavorazioni").delete().eq("id", id);
      if (error) return err(error.message);
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
