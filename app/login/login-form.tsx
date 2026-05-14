"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { ThemeToggle } from "@/components/gestionale/theme-toggle";
import { isStagingBlockedPathname, isStagingPublicSlice } from "@/lib/env/staging-public";
import { dsBtnPrimary, dsInput } from "@/lib/ui/design-system";

const loginInputClass = `mt-1 ${dsInput} dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500`;

function safeRedirectTarget(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/login")) return "/dashboard";
  const pathOnly = raw.split("?")[0] ?? raw;
  if (isStagingPublicSlice() && isStagingBlockedPathname(pathOnly)) {
    return "/dashboard?staging_unavailable=1";
  }
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, status } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    const target = safeRedirectTarget(searchParams.get("from"));
    router.replace(target);
    router.refresh();
  }, [status, router, searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await login(username, password, remember);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      const target = safeRedirectTarget(searchParams.get("from"));
      router.replace(target);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const busy = pending;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-100 px-4 py-10 dark:bg-zinc-950">
      <div className="relative w-full max-w-[400px] rounded-2xl border border-zinc-200 bg-white p-6 pt-14 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-white">CAB</div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Gestionale</p>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Accedi</h1>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Username
            <input
              name="username"
              autoComplete="username"
              className={`${loginInputClass} min-h-11`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className={`${loginInputClass} min-h-11`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={busy}
              className="h-5 w-5 shrink-0 rounded border-zinc-400 text-orange-600 focus:ring-orange-400/40 dark:border-zinc-500"
            />
            Ricordami su questo dispositivo
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className={`${dsBtnPrimary} min-h-12 w-full justify-center py-3`}
          >
            {busy ? "Accesso…" : "Entra"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          {isStagingPublicSlice() ? "Staging pubblico · accesso controllato" : "Accesso riservato · credenziali fornite dall’amministratore"}
        </p>
      </div>
    </div>
  );
}
