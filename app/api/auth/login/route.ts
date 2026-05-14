import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  cookieMaxAgeSeconds,
  createSessionPayload,
  serializeSessionPayload,
} from "@/lib/auth/session";
import { findAuthUserByCredentials, toPublicUser } from "@/lib/auth/users";

export async function POST(req: Request) {
  let body: { username?: string; password?: string; remember?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const user = findAuthUserByCredentials(String(body.username ?? ""), String(body.password ?? ""));
  if (!user) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }

  const remember = Boolean(body.remember);
  const payload = createSessionPayload(user.id, remember);
  const token = serializeSessionPayload(payload);
  const maxAge = cookieMaxAgeSeconds(remember);

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    ...(maxAge !== undefined ? { maxAge } : {}),
  });

  return NextResponse.json({ user: toPublicUser(user) });
}
