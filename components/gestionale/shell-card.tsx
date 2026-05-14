import type { ReactNode } from "react";
import { dsSurfaceCard } from "@/lib/ui/design-system";

export function ShellCard({
  title,
  subtitle,
  children,
  className = "",
  id,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`${dsSurfaceCard} ${className}`}>
      {(title || subtitle) && (
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          {title ? (
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          ) : null}
          {subtitle ? <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p> : null}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
