import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME, sessionUserFromPayload } from "@/lib/auth/session";

export async function GET() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  const payload = parseSessionCookie(raw);
  if (!payload) {
    return NextResponse.json({ user: null });
  }
  const user = sessionUserFromPayload(payload);
  return NextResponse.json({ user });
}
