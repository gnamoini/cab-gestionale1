"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { dsSkeletonPulse, dsSurfaceCard, dsTypoBody, dsTypoPageTitle } from "@/lib/ui/design-system";

function timeGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Buongiorno";
  if (hour >= 12 && hour < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export function DashboardWelcome() {
  const { status, authorName } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { greeting, who } = useMemo(() => {
    if (!mounted) {
      return { greeting: "Buongiorno", who: "" as string };
    }
    const h = new Date().getHours();
    const g = timeGreeting(h);
    const w =
      status === "authenticated" && authorName.trim()
        ? authorName.trim().toUpperCase()
        : "TEAM CAB";
    return { greeting: g, who: w };
  }, [mounted, status, authorName]);

  if (!mounted) {
    return (
      <div className={`${dsSurfaceCard} border-[color:color-mix(in_srgb,var(--cab-border)_80%,transparent)] bg-gradient-to-br from-[var(--cab-card)] to-[color:color-mix(in_srgb,var(--cab-surface-2)_70%,var(--cab-card))] px-5 py-5`} aria-hidden>
        <div className={`h-7 w-64 max-w-full ${dsSkeletonPulse}`} />
        <div className={`mt-3 h-4 w-48 max-w-full ${dsSkeletonPulse} opacity-70`} />
      </div>
    );
  }

  return (
    <div
      className={`${dsSurfaceCard} border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] bg-gradient-to-br from-[var(--cab-card)] to-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface-2))] px-5 py-5`}
    >
      <p className={`${dsTypoPageTitle} md:text-xl`}>
        {greeting}, {who}
      </p>
      <p className={`${dsTypoBody} mt-1 text-[color:var(--cab-text-muted)]`}>Benvenuto nel gestionale CAB</p>
    </div>
  );
}
