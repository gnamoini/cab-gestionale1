export const SUPPORTO_NOTES_STORAGE_KEY = "gestionale-supporto-notes-v1";
export const SUPPORTO_NOTES_MAX = 300;

export type SupportoNote = {
  id: string;
  /** Testo libero (bug, richieste, promemoria). */
  body: string;
  autore: string;
  at: string;
  resolved: boolean;
};

function nextId(): string {
  return `supn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeNote(x: unknown): SupportoNote | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : null;
  const body = typeof o.body === "string" ? o.body : typeof o.text === "string" ? o.text : "";
  const autore = typeof o.autore === "string" && o.autore.trim() ? o.autore.trim() : "Sistema";
  const at = typeof o.at === "string" && o.at.trim() ? o.at.trim() : new Date().toISOString();
  const resolved = Boolean(o.resolved);
  if (!id || !body.trim()) return null;
  return { id, body: body.trim(), autore, at, resolved };
}

export function loadSupportoNotes(): SupportoNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SUPPORTO_NOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: SupportoNote[] = [];
    for (const item of parsed) {
      const n = sanitizeNote(item);
      if (n) out.push(n);
    }
    out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return out.slice(0, SUPPORTO_NOTES_MAX);
  } catch {
    return [];
  }
}

export function saveSupportoNotes(notes: SupportoNote[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SUPPORTO_NOTES_STORAGE_KEY, JSON.stringify(notes.slice(0, SUPPORTO_NOTES_MAX)));
  } catch {
    /* ignore quota */
  }
}

export function createSupportoNote(body: string, autore: string): SupportoNote {
  return {
    id: nextId(),
    body: body.trim(),
    autore: autore.trim() || "Utente CAB",
    at: new Date().toISOString(),
    resolved: false,
  };
}
