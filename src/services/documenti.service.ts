"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { CategoriaDocumento, DocumentoRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "documenti";

export type DocumentiFilters = {
  mezzo_id?: string;
  marca?: string;
  categoria?: CategoriaDocumento;
};

export type DocumentoInsert = Omit<DocumentoRow, "id" | "created_at">;
export type DocumentoUpdate = Partial<DocumentoInsert>;

function mergeDocumentoMeta(
  data: DocumentoInsert | DocumentoUpdate,
  opts?: { setUploadTimestamp?: boolean },
): DocumentoInsert | DocumentoUpdate {
  const base = (data.meta && typeof data.meta === "object" ? data.meta : {}) as Record<string, unknown>;
  const meta: Record<string, unknown> = { ...base };
  if (opts?.setUploadTimestamp && typeof meta.uploadedAt !== "string") {
    meta.uploadedAt = new Date().toISOString();
  }
  return { ...data, meta };
}

async function sb() {
  return getBrowserSupabase();
}

export const documentiService = {
  async getAll(filters?: DocumentiFilters): Promise<ServiceResult<DocumentoRow[]>> {
    try {
      const c = await sb();
      let q = c.from("documenti").select("*").order("created_at", { ascending: false });
      if (filters?.mezzo_id) q = q.eq("mezzo_id", filters.mezzo_id);
      if (filters?.marca?.trim()) q = q.ilike("marca", `%${filters.marca.trim()}%`);
      if (filters?.categoria) q = q.eq("categoria", filters.categoria);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as DocumentoRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<DocumentoRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("documenti").select("*").eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Documento non trovato");
      return success(data as DocumentoRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: DocumentoInsert): Promise<ServiceResult<DocumentoRow>> {
    try {
      const c = await sb();
      const merged = mergeDocumentoMeta(data, { setUploadTimestamp: true }) as DocumentoInsert;
      const { data: row, error } = await c.from("documenti").insert(merged).select("*").single();
      if (error) return err(error.message);
      const r = row as DocumentoRow;
      await writeModificaLog(c, { entita: ENTITA, entita_id: r.id, azione: "CREATE", payload: auditSnapshot(r) });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: DocumentoUpdate): Promise<ServiceResult<DocumentoRow>> {
    try {
      const c = await sb();
      const { data: before, error: e0 } = await c.from("documenti").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      const merged = mergeDocumentoMeta({ ...(before as DocumentoRow), ...data }, { setUploadTimestamp: false });
      const { data: row, error } = await c.from("documenti").update(merged).eq("id", id).select("*").single();
      if (error) return err(error.message);
      const r = row as DocumentoRow;
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
      const { data: existing, error: e0 } = await c.from("documenti").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (existing) await writeModificaLog(c, { entita: ENTITA, entita_id: id, azione: "DELETE", payload: auditSnapshot(existing) });
      const { error } = await c.from("documenti").delete().eq("id", id);
      if (error) return err(error.message);
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
