import type { ReactNode, SVGProps } from "react";
import { isStagingPublicSlice, STAGING_MODULE_BADGE, STAGING_SAFE_HREFS } from "@/lib/env/staging-public";

function SvgIcon(props: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  const { children, className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4 shrink-0"}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconNavDashboard(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M4 11h6V4H4v7zm10 0h6V4h-6v7zM4 20h6v-7H4v7zm10 0h6v-7h-6v7z" />
    </SvgIcon>
  );
}

export function IconNavLavorazioni(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </SvgIcon>
  );
}

export function IconNavMagazzino(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </SvgIcon>
  );
}

export function IconNavDocumenti(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </SvgIcon>
  );
}

export function IconNavMezzi(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M14 18V6a2 2 0 00-2-2H4a2 2 0 00-2 2v11a1 1 0 001 1h1" />
      <path d="M15 18h2M14 10h7l3 3v5a1 1 0 01-1 1h-1" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </SvgIcon>
  );
}

export function IconNavPreventivi(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h6" />
    </SvgIcon>
  );
}

export function IconNavReport(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </SvgIcon>
  );
}

export function IconNavBunder(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M8 4h12a2 2 0 012 2v14H8a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path d="M8 8h12M8 12h10M8 16h8" />
    </SvgIcon>
  );
}

export function IconNavSupporto(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
      <circle cx="12" cy="12" r="10" />
    </SvgIcon>
  );
}

export const GESTIONALE_NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: IconNavDashboard },
  { href: "/lavorazioni", label: "Lavorazioni", Icon: IconNavLavorazioni },
  { href: "/preventivi", label: "Preventivi", Icon: IconNavPreventivi },
  { href: "/documenti", label: "Documenti", Icon: IconNavDocumenti },
  { href: "/magazzino", label: "Magazzino", Icon: IconNavMagazzino },
  { href: "/mezzi", label: "Mezzi", Icon: IconNavMezzi },
  { href: "/bunder", label: "BUNDER", Icon: IconNavBunder },
  { href: "/report", label: "Report", Icon: IconNavReport },
  { href: "/supporto", label: "Supporto", Icon: IconNavSupporto },
] as const;

export type GestionaleNavHref = (typeof GESTIONALE_NAV)[number]["href"];

export type GestionaleNavResolvedItem = {
  href: GestionaleNavHref;
  label: (typeof GESTIONALE_NAV)[number]["label"];
  Icon: (typeof GESTIONALE_NAV)[number]["Icon"];
  disabled: boolean;
  badge: string | null;
};

/** Nav risolta: in staging pubblico alcune voci sono disabilitate con badge. */
export function resolveGestionaleNav(): GestionaleNavResolvedItem[] {
  const staging = isStagingPublicSlice();
  const safe = new Set<string>(STAGING_SAFE_HREFS);
  return GESTIONALE_NAV.map((item) => {
    const disabled = staging && !safe.has(item.href);
    return {
      href: item.href,
      label: item.label,
      Icon: item.Icon,
      disabled,
      badge: disabled ? STAGING_MODULE_BADGE : null,
    };
  });
}
