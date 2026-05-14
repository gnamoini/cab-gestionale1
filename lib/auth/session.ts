import { findAuthUserById, toPublicUser, type PublicAuthUser } from "@/lib/auth/users";

/** Cookie httpOnly usata da middleware e API (Edge-safe, senza Buffer). */
export const SESSION_COOKIE_NAME = "gestionale_session";

/** Metadati client opzionali (ricordami) — la sessione autoritativa resta nel cookie. */
export const AUTH_LS_META_KEY = "gestionale-auth-meta-v1";

export type SessionPayload = {
  sub: string;
  exp: number;
};

export function createSessionPayload(userId: string, remember: boolean): SessionPayload {
  const now = Date.now();
  const ttlMs = remember ? 1000 * 60 * 60 * 24 * 14 : 1000 * 60 * 60 * 24;
  return { sub: userId, exp: now + ttlMs };
}

export function serializeSessionPayload(p: SessionPayload): string {
  return encodeURIComponent(JSON.stringify(p));
}

export function parseSessionCookie(raw: string | undefined | null): SessionPayload | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(decodeURIComponent(raw)) as SessionPayload;
    if (!p || typeof p.sub !== "string" || typeof p.exp !== "number") return null;
    if (Number.isNaN(p.exp) || Date.now() > p.exp) return null;
    if (!findAuthUserById(p.sub)) return null;
    return p;
  } catch {
    return null;
  }
}

/** maxAge secondi per Set-Cookie; `undefined` = session cookie (chiude con il browser). */
export function cookieMaxAgeSeconds(remember: boolean): number | undefined {
  return remember ? 60 * 60 * 24 * 14 : undefined;
}

export function sessionUserFromPayload(payload: SessionPayload): PublicAuthUser | null {
  const rec = findAuthUserById(payload.sub);
  return rec ? toPublicUser(rec) : null;
}
