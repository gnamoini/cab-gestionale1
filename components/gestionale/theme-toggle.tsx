"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/context/theme-context";
import { dsPageToolbarBtn } from "@/lib/ui/design-system";

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="4" strokeLinecap="round" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { resolved, toggleLightDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const label = resolved === "dark" ? "Passa a tema chiaro" : "Passa a tema scuro";

  if (!mounted) {
    return (
      <span
        className="inline-flex h-11 min-w-[2.75rem] shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLightDark}
      className={`${dsPageToolbarBtn} h-11 min-w-[2.75rem] px-2.5 sm:px-3`}
      title={label}
      aria-label={label}
    >
      {resolved === "dark" ? <IconSun className="h-[18px] w-[18px]" /> : <IconMoon className="h-[18px] w-[18px]" />}
    </button>
  );
}
