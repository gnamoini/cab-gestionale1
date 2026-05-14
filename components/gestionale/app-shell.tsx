"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/context/auth-context";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { resolveGestionaleNav, type GestionaleNavResolvedItem } from "@/components/gestionale/gestionale-nav-config";
import { ThemeToggle } from "@/components/gestionale/theme-toggle";
import { CAB_THEME_STORAGE_KEY } from "@/lib/theme/cab-theme-storage";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";

const SIDEBAR_COLLAPSED_KEY = "cab-sidebar-collapsed";

const navLinkBase =
  "group relative flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-200 ease-out";

const navLinkInactive =
  "text-zinc-600 hover:bg-zinc-100/95 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/90 dark:hover:text-zinc-100";

const navLinkActive =
  "bg-orange-500/[0.12] text-orange-700 before:absolute before:left-0 before:top-1/2 before:h-8 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-orange-500 dark:bg-orange-500/15 dark:text-orange-300";

function NavLink({
  href,
  label,
  Icon,
  collapsed,
  disabled,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => ReactNode;
  collapsed: boolean;
  disabled?: boolean;
  badge?: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const iconWrap = (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-200 ${
        active && !disabled
          ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
          : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-200"
      } ${disabled ? "opacity-60" : ""}`}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );

  if (disabled) {
    return (
      <div
        role="link"
        aria-disabled="true"
        title={collapsed ? `${label} — ${badge ?? "Non disponibile"}` : badge ?? undefined}
        className={`${navLinkBase} cursor-not-allowed opacity-75 ${collapsed ? "justify-center px-2" : ""}`}
      >
        {iconWrap}
        <span className={`min-w-0 flex-1 truncate leading-tight ${collapsed ? "sr-only" : ""}`}>{label}</span>
        {!collapsed && badge ? (
          <span className="ml-auto shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
            {badge}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={`${navLinkBase} ${active ? navLinkActive : navLinkInactive} ${collapsed ? "justify-center px-2" : ""} ${erpFocus}`}
    >
      {iconWrap}
      <span className={`min-w-0 flex-1 truncate leading-tight ${collapsed ? "sr-only" : ""}`}>{label}</span>
    </Link>
  );
}

function AccountMenu({ compact }: { compact?: boolean }) {
  const { user, logout, status } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function onLogout() {
    setOpen(false);
    await logout();
    window.location.assign("/login");
  }

  const initial = (user?.nome?.trim()?.charAt(0) ?? user?.username?.trim()?.charAt(0) ?? "?").toUpperCase();
  const label = status === "loading" ? "…" : user?.nome ?? "Account";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex max-w-[14rem] items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-left text-xs shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${erpFocus} ${compact ? "min-h-11" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-white">
          {initial}
        </span>
        <span className={`min-w-0 flex-1 truncate font-medium text-zinc-800 dark:text-zinc-100 ${compact ? "max-md:sr-only" : ""}`}>
          {label}
        </span>
        <span className="shrink-0 text-zinc-400 max-md:sr-only" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 max-h-[min(70vh,24rem)] w-44 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg gestionale-scrollbar dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
            <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">{user?.nome ?? "Utente"}</p>
            <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{user?.username ? `@${user.username}` : ""}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void onLogout()}
            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <span className="text-zinc-400" aria-hidden>
              ⎋
            </span>
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SidebarAccountFooter() {
  const { user, logout, status } = useAuth();

  async function onLogout() {
    await logout();
    window.location.assign("/login");
  }

  const nome = status === "loading" ? "…" : user?.nome ?? "Account";

  return (
    <div className="border-t border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-xs font-bold text-white">
          {(user?.nome?.trim()?.charAt(0) ?? user?.username?.trim()?.charAt(0) ?? "?").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">{nome}</p>
          {user?.username ? (
            <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">@{user.username}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void onLogout()}
        className={`mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${erpFocus}`}
      >
        Esci
      </button>
      <p className="mt-2 text-center text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
        {isStagingPublicSlice() ? "Staging pubblico · moduli limitati" : "Ambiente interno · verificare i dati"}
      </p>
    </div>
  );
}

function MobileNavRow({
  item,
  pathname,
  onClose,
}: {
  item: GestionaleNavResolvedItem;
  pathname: string;
  onClose: () => void;
}) {
  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const Icon = item.Icon;
  if (item.disabled) {
    return (
      <div
        className={`flex min-h-[3.25rem] items-center gap-3 rounded-xl px-3 text-base font-semibold text-zinc-400 dark:text-zinc-500 ${
          active ? "bg-zinc-100/80 dark:bg-zinc-800/50" : ""
        }`}
        aria-disabled
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge ? (
          <span className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
            {item.badge}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`flex min-h-[3.25rem] items-center gap-3 rounded-xl px-3 text-base font-semibold ${
        active
          ? "bg-orange-500/15 text-orange-800 dark:text-orange-200"
          : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
      } ${erpFocus}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          active ? "bg-orange-500/25 text-orange-700 dark:text-orange-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        }`}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function MobileNavDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] md:hidden" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" aria-label="Chiudi menu" onClick={onClose} />
      <div
        className="cab-nav-drawer-panel absolute inset-y-0 left-0 flex w-[min(19.5rem,88vw)] flex-col border-r border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-label="Menu principale"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white">
              CAB
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Gestionale</p>
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">Manutenzione</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-200 bg-white text-base font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${erpFocus}`}
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>
        <nav className="gestionale-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Sezioni principali">
          {resolveGestionaleNav().map((item) => (
            <MobileNavRow key={item.href} item={item} pathname={pathname} onClose={onClose} />
          ))}
        </nav>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const asideW = collapsed ? "md:w-[4.25rem]" : "md:w-[12.75rem]";
  const mainPad = collapsed ? "md:pl-[4.25rem]" : "md:pl-[12.75rem]";

  return (
    <div className="flex min-h-dvh bg-[var(--cab-bg-app)] text-[color:var(--cab-text)]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[color:var(--cab-border)] bg-[var(--cab-card)] transition-[width] duration-200 ease-out md:flex ${asideW}`}
      >
        <div
          className={`flex shrink-0 border-b border-[color:var(--cab-border)] ${
            collapsed
              ? "flex-col items-stretch gap-1.5 px-1.5 py-2"
              : "h-14 flex-row items-center gap-2 px-2.5"
          }`}
        >
          <div className={`flex min-w-0 items-center gap-2 ${collapsed ? "justify-center" : "min-w-0 flex-1"}`}>
            <div
              className={`flex shrink-0 items-center justify-center rounded-lg bg-orange-500 font-bold text-white ${
                collapsed ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm"
              }`}
            >
              CAB
            </div>
            <div
              className={`min-w-0 flex-1 leading-tight transition-opacity duration-200 ease-out ${
                collapsed ? "pointer-events-none hidden opacity-0" : ""
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Gestionale</p>
              <p className="truncate text-sm font-semibold text-[color:var(--cab-text)]">Manutenzione</p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Espandi menu" : "Comprimi menu"}
            aria-label={collapsed ? "Espandi menu laterale" : "Comprimi menu laterale"}
            className={`hidden min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] text-sm text-[color:var(--cab-text-muted)] transition-[background-color,border-color,color,transform] duration-200 ease-out hover:bg-[var(--cab-hover)] md:inline-flex dark:border-[color:var(--cab-border-strong)] ${erpFocus} ${
              collapsed ? "mx-auto" : ""
            }`}
          >
            {collapsed ? "⟩" : "⟨"}
          </button>
        </div>
        <nav
          className="gestionale-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3"
          aria-label="Sezioni principali"
        >
          {resolveGestionaleNav().map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.Icon}
              collapsed={collapsed}
              disabled={item.disabled}
              badge={item.badge}
            />
          ))}
        </nav>
        <div className={collapsed ? "hidden" : "block"}>
          <SidebarAccountFooter />
        </div>
      </aside>

      <div className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out ${mainPad}`}>
        <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-card)_88%,transparent)] px-2 backdrop-blur-md sm:px-4 md:flex md:justify-between md:gap-3">
          <button
            type="button"
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] text-lg shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)] md:hidden dark:border-[color:var(--cab-border-strong)] ${erpFocus}`}
            aria-label="Apri menu"
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>

          <Link
            href="/dashboard"
            className={`${erpFocus} hidden min-w-0 items-center gap-2.5 rounded-lg py-1 pr-2 md:inline-flex`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-xs font-bold text-white">
              CAB
            </span>
            <span className="truncate text-sm font-semibold text-[color:var(--cab-text)]">Gestionale</span>
          </Link>

          <div className="flex min-w-0 items-center justify-center gap-2 md:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-500 text-xs font-bold text-white">
              CAB
            </div>
            <span className="truncate text-sm font-semibold text-[color:var(--cab-text)]">Manutenzione</span>
          </div>

          <div className="flex shrink-0 items-center gap-2 justify-self-end md:ml-auto">
            <ThemeToggle />
            <AccountMenu compact />
          </div>
        </header>

        <MobileNavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

        <main className="gestionale-scrollbar flex-1 overflow-auto p-4 md:p-6">
          {!isSupabasePublicEnvConfigured() ? (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Configurazione server: impostare <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
              <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> per il collegamento al database.
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
