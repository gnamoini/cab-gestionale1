"use client";

import type { User } from "@/src/lib/supabase/browser-client";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { ProfileRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export type ProfileFilters = {
  ruolo?: ProfileRow["ruolo"];
  search?: string;
};

export type ProfileUpdate = Partial<Pick<ProfileRow, "nome" | "ruolo">>;

export type SignUpInput = {
  email: string;
  password: string;
};

async function getClient() {
  return getBrowserSupabase();
}

export const authService = {
  async getAll(filters?: ProfileFilters): Promise<ServiceResult<ProfileRow[]>> {
    try {
      const sb = await getClient();
      let q = sb.from("profiles").select("*").order("nome", { ascending: true });
      if (filters?.ruolo) q = q.eq("ruolo", filters.ruolo);
      if (filters?.search?.trim()) q = q.ilike("nome", `%${filters.search.trim()}%`);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as ProfileRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<ProfileRow>> {
    try {
      const sb = await getClient();
      const { data, error } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Profilo non trovato");
      return success(data as ProfileRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: SignUpInput): Promise<ServiceResult<User>> {
    try {
      const sb = await getClient();
      const { data: res, error } = await sb.auth.signUp({
        email: data.email,
        password: data.password,
      });
      if (error) return err(error.message);
      if (!res.user) return err("Registrazione senza utente");
      const { data: profile } = await sb.from("profiles").select("*").eq("id", res.user.id).maybeSingle();
      if (profile) {
        await writeModificaLog(sb, {
          entita: "profiles",
          entita_id: res.user.id,
          azione: "CREATE",
          payload: auditSnapshot(profile),
        });
      }
      return success(res.user);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: ProfileUpdate): Promise<ServiceResult<ProfileRow>> {
    try {
      const sb = await getClient();
      const { data: before, error: e0 } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      const { data: row, error } = await sb.from("profiles").update(data).eq("id", id).select("*").single();
      if (error) return err(error.message);
      const r = row as ProfileRow;
      await writeModificaLog(sb, {
        entita: "profiles",
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
      const sb = await getClient();
      const { data: existing, error: readErr } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
      if (readErr) return err(readErr.message);
      if (existing) {
        await writeModificaLog(sb, {
          entita: "profiles",
          entita_id: id,
          azione: "DELETE",
          payload: auditSnapshot(existing),
        });
      }
      const { error } = await sb.from("profiles").delete().eq("id", id);
      if (error) return err(error.message);
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
