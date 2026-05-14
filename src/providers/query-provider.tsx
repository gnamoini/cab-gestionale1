"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, type QueryCacheNotifyEvent } from "@tanstack/react-query";
import { useToast } from "@/context/toast-context";

function permissionLikely(msg: string): boolean {
  return /\b(401|403)\b|permesso|negato|\brls\b|unauthor|forbidden|jwt|sessione|non autenticat|not authorized/i.test(msg);
}

function QueryErrorToasts({ client }: { client: QueryClient }) {
  const { push } = useToast();
  const pushRef = useRef(push);
  pushRef.current = push;

  useEffect(() => {
    const last = new Map<string, number>();
    const maybePush = (key: string, message: string) => {
      const now = Date.now();
      if ((last.get(key) ?? 0) > now - 5000) return;
      last.set(key, now);
      pushRef.current(message, "warning", 5600);
    };

    const onQuery = (e: QueryCacheNotifyEvent) => {
      if (e.type !== "updated") return;
      const q = e.query;
      if (q.state.status !== "error" || !q.state.error) return;
      const msg = q.state.error instanceof Error ? q.state.error.message : String(q.state.error);
      if (!permissionLikely(msg)) return;
      maybePush(`q:${JSON.stringify(q.queryKey)}`, "Accesso ai dati negato o permessi insufficienti. Verifica la sessione o i permessi sul database.");
    };

    const uq = client.getQueryCache().subscribe(onQuery);
    const um = client.getMutationCache().subscribe((ev) => {
      if (ev.type !== "updated") return;
      const m = ev.mutation;
      if (m.state.status !== "error" || !m.state.error) return;
      const msg = m.state.error instanceof Error ? m.state.error.message : String(m.state.error);
      if (!permissionLikely(msg)) return;
      maybePush(`m:${String(m.options.mutationKey ?? "mutation")}`, "Operazione non consentita o permessi insufficienti.");
    });

    return () => {
      uq();
      um();
    };
  }, [client]);

  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <QueryErrorToasts client={client} />
      {children}
    </QueryClientProvider>
  );
}
