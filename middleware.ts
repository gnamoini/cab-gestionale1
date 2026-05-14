import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { isStagingBlockedPathname, isStagingPublicSlice } from "@/lib/env/staging-public";

const LOGIN_PATH = "/login";

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname === "/favicon.ico") return true;
  if (/\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot)$/.test(pathname)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = parseSessionCookie(raw);

  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    const from = pathname === "/" ? "/dashboard" : `${pathname}${request.nextUrl.search}`;
    url.searchParams.set("from", from);
    return NextResponse.redirect(url);
  }

  if (isStagingPublicSlice() && isStagingBlockedPathname(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set("staging_unavailable", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data).*)"],
};
