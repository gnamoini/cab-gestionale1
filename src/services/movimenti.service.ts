"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MagazzinoRicambioRow, MovimentoRicambioRow, TipoMovimentoRicambio } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "movimenti_ricambi";
const ENT_MAG = "magazzino_ricambi";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Segno applicazione movimento su giacenza: entrata +, uscita −. reverse inverte (per delete / rollback). */
function stockDelta(tipo: TipoMovimentoRicambio, quantita: number, reverse: boolean): number {
  const base = tipo === "entrata" ? 1 : -1;
  const s = reverse ? -base : base;
  return s * quantita;
}

async function applyStockForMovement(
  c: Awaited<ReturnType<typeof getBrowserSupabase>>,
  mov: Pick<MovimentoRicambioRow, "ricambio_id" | "tipo" | "quantita">,
  reverse: boolean,
): Promise<ServiceResult<MagazzinoRicambioRow>> {
  const { data: ric, error: e1 } = await c.from("magazzino_ricambi").select("*").eq("id", mov.ricambio_id).maybeSingle();
  if (e1) return err(e1.message);
  if (!ric) return err("Ricambio non trovato");
  const before = ric as MagazzinoRicambioRow;
  const q0 = num(before.quantita);
  const dq = stockDelta(mov.tipo, num(mov.quantita), reverse);
  const q1 = q0 + dq;
  if (q1 < 0) return err("Giacenza insufficiente per il movimento richiesto");
  const { data: after, error: e2 } = await c
    .from("magazzino_ricambi")
    .update({ quantita: q1 })
    .eq("id", mov.ricambio_id)
    .select("*")
    .single();
  if (e2) return err(e2.message);
  const updated = after as MagazzinoRicambioRow;
  await writeModificaLog(c, {
    entita: ENT_MAG,
    entita_id: mov.ricambio_id,
    azione: "UPDATE",
    payload: auditDiff(before, updated),
  });
  return success(updated);
}

export type MovimentiFilters = {
  ricambio_id?: string;
  lavorazione_id?: string;
  /** Filtro OR su più lavorazioni (es. tutte le lavorazioni di un mezzo). */
  lavorazione_ids?: string[];
  tipo?: TipoMovimentoRicambio;
};

export type MovimentoInsert = Omit<MovimentoRicambioRow, "id" | "created_at">;
export type MovimentoUpdate = Partial<Pick<MovimentoRicambioRow, "tipo" | "quantita" | "lavorazione_id">>;

async function sb() {
  return getBrowserSupabase();
}

export const movimentiService = {
  async getAll(filters?: MovimentiFilters): Promise<ServiceResult<MovimentoRicambioRow[]>> {
    try {
      const c = await sb();
      let q = c.from("movimenti_ricambi").select("*").order("created_at", { ascending: false });
      if (filters?.ricambio_id) q = q.eq("ricambio_id", filters.ricambio_id);
      if (filters?.lavorazione_id) q = q.eq("lavorazione_id", filters.lavorazione_id);
      else if (filters?.lavorazione_ids?.length) q = q.in("lavorazione_id", filters.lavorazione_ids);
      if (filters?.tipo) q = q.eq("tipo", filters.tipo);
      const { data, error } = await q;
      if (error) return err(error.message);
      return success((data ?? []) as MovimentoRicambioRow[]);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<MovimentoRicambioRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("movimenti_ricambi").select("*").eq("id", id).maybeSingle();
      if (error) return err(error.message);
      if (!data) return err("Movimento non trovato");
      return success(data as MovimentoRicambioRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: MovimentoInsert): Promise<ServiceResult<MovimentoRicambioRow>> {
    try {
      const c = await sb();
      const stock = await applyStockForMovement(c, data, false);
      if (!stock.success) return err(stock.error ?? "Aggiornamento giacenza fallito");

      const { data: row, error } = await c.from("movimenti_ricambi").insert(data).select("*").single();
      if (error) {
        await applyStockForMovement(c, data, true);
        return err(error.message);
      }
      const r = row as MovimentoRicambioRow;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: r.id,
        azione: "CREATE",
        payload: auditSnapshot(r),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async update(id: string, data: MovimentoUpdate): Promise<ServiceResult<MovimentoRicambioRow>> {
    try {
      const c = await sb();
      const { data: oldRow, error: e0 } = await c.from("movimenti_ricambi").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (!oldRow) return err("Movimento non trovato");
      const old = oldRow as MovimentoRicambioRow;

      const affectsStock = data.tipo != null || data.quantita != null;

      if (!affectsStock) {
        const { data: row, error } = await c.from("movimenti_ricambi").update(data).eq("id", id).select("*").single();
        if (error) return err(error.message);
        const r = row as MovimentoRicambioRow;
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: id,
          azione: "UPDATE",
          payload: auditDiff(old, r),
        });
        return success(r);
      }

      const revOld = await applyStockForMovement(c, old, true);
      if (!revOld.success) return err(revOld.error ?? "Rollback stock fallito");

      const next: MovimentoRicambioRow = {
        ...old,
        tipo: (data.tipo ?? old.tipo) as TipoMovimentoRicambio,
        quantita: data.quantita != null ? num(data.quantita) : old.quantita,
        lavorazione_id: data.lavorazione_id !== undefined ? data.lavorazione_id : old.lavorazione_id,
      };

      const applyNew = await applyStockForMovement(
        c,
        { ricambio_id: next.ricambio_id, tipo: next.tipo, quantita: next.quantita },
        false,
      );
      if (!applyNew.success) {
        await applyStockForMovement(c, old, false);
        return err(applyNew.error ?? "Aggiornamento giacenza fallito");
      }

      const { data: row, error } = await c
        .from("movimenti_ricambi")
        .update(data)
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        await applyStockForMovement(c, next, true);
        await applyStockForMovement(c, old, false);
        return err(error.message);
      }
      const r = row as MovimentoRicambioRow;
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(old, r),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async remove(id: string): Promise<ServiceResult<null>> {
    try {
      const c = await sb();
      const { data: existing, error: e0 } = await c.from("movimenti_ricambi").select("*").eq("id", id).maybeSingle();
      if (e0) return err(e0.message);
      if (!existing) return success(null);
      const ex = existing as MovimentoRicambioRow;

      const stock = await applyStockForMovement(c, ex, true);
      if (!stock.success) return err(stock.error ?? "Impossibile stornare giacenza");

      const { error } = await c.from("movimenti_ricambi").delete().eq("id", id);
      if (error) {
        await applyStockForMovement(c, ex, false);
        return err(error.message);
      }
      await writeModificaLog(c, {
        entita: ENTITA,
        entita_id: id,
        azione: "DELETE",
        payload: auditSnapshot(ex),
      });
      return success(null);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
