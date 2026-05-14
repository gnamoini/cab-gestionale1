"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

/**
 * Dopo il middleware (cookie sessione), attende `/api/auth/me` e reindirizza
 * se la sessione non risulta più valida. Mostra uno stato di caricamento globale.
 */
export function GestionaleAuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "anonymous") return;
    const from = `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`;
    router.replace(`/login?from=${encodeURIComponent(from || "/dashboard")}`);
  }, [status, router, pathname]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-[color:var(--cab-border)] border-t-[color:var(--cab-primary)]"
          aria-hidden
        />
        <p className="text-sm font-medium text-[color:var(--cab-text-muted)]">Caricamento sessione…</p>
      </div>
    );
  }

  if (status === "anonymous") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4 py-16 text-center">
        <p className="text-sm text-[color:var(--cab-text-muted)]">Reindirizzamento al login…</p>
      </div>
    );
  }

  return <>{children}</>;
}
