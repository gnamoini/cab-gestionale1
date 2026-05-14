"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { resolveGestionaleNav } from "@/components/gestionale/gestionale-nav-config";
import { dsSurfaceCard, dsTypoCardTitle } from "@/lib/ui/design-system";

export function DashboardQuickNav() {
  const pathname = usePathname();
  const items = resolveGestionaleNav().filter((item) => item.href !== "/supporto");

  return (
    <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
      <h2 className={dsTypoCardTitle}>Navigazione rapida</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.Icon;
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="group flex cursor-not-allowed flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-200 px-3 py-3.5 text-center opacity-70 dark:border-zinc-700"
                aria-disabled
                title={item.badge ?? undefined}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold leading-tight text-zinc-500 dark:text-zinc-400">{item.label}</span>
                {item.badge ? (
                  <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                    {item.badge}
                  </span>
                ) : null}
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex flex-col items-center gap-2 rounded-xl border px-3 py-3.5 text-center transition-all hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] hover:shadow-[var(--cab-shadow-md)] active:scale-[0.98] ${erpFocus} ${
                active
                  ? "border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-card))] text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)]"
                  : "border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] text-[color:var(--cab-text)]"
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
                  active
                    ? "border-[color:color-mix(in_srgb,var(--cab-primary)_40%,var(--cab-border))] bg-[var(--cab-card)] text-[color:var(--cab-primary)]"
                    : "border-[color:var(--cab-border)] bg-[var(--cab-card)] text-[color:var(--cab-text-muted)] group-hover:border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] group-hover:text-[color:var(--cab-primary)]"
                }`}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
