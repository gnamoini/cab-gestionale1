import type { SupabaseClient } from "@/src/lib/supabase/browser-client";

export type AuditAzione = "CREATE" | "UPDATE" | "DELETE";

export type AuditPayload = unknown;

export function auditSnapshot(row: unknown): AuditPayload {
  return { snapshot: row };
}

export function auditDiff(before: unknown, after: unknown): AuditPayload {
  return { before, after };
}

export async function writeModificaLog(
  client: SupabaseClient,
  input: {
    entita: string;
    entita_id: string;
    azione: AuditAzione;
    payload?: AuditPayload;
    autore_id?: string | null;
  },
): Promise<void> {
  let autore = input.autore_id;
  if (autore === undefined) {
    const { data: userData } = await client.auth.getUser();
    autore = userData.user?.id ?? null;
  }
  if (!autore) return;

  await client.from("log_modifiche").insert({
    entita: input.entita,
    entita_id: input.entita_id,
    azione: input.azione,
    autore_id: autore,
    payload: input.payload ?? null,
  });
}
