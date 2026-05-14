"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CAB_THEME_STORAGE_KEY } from "@/lib/theme/cab-theme-storage";

export type ThemePreference = "light" | "dark" | "system";

function readStored(): ThemePreference | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CAB_THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyThemeToDocument(pref: ThemePreference) {
  const root = document.documentElement;
  const isDark = pref === "dark" || (pref === "system" && systemPrefersDark());
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (p: ThemePreference) => void;
  /** Salva esplicitamente light o dark (utile dal toggle sole/luna). */
  toggleLightDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function flashThemeTransition() {
  document.documentElement.classList.add("cab-theme-transition");
  window.setTimeout(() => {
    document.documentElement.classList.remove("cab-theme-transition");
  }, 220);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useLayoutEffect(() => {
    const stored = readStored();
    const p = stored ?? "system";
    setPreferenceState(p);
    applyThemeToDocument(p);
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeToDocument("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    flashThemeTransition();
    setPreferenceState(p);
    try {
      if (p === "system") localStorage.removeItem(CAB_THEME_STORAGE_KEY);
      else localStorage.setItem(CAB_THEME_STORAGE_KEY, p);
    } catch {
      /* ignore */
    }
    applyThemeToDocument(p);
  }, []);

  const resolved: "light" | "dark" =
    preference === "dark" || (preference === "system" && systemPrefersDark()) ? "dark" : "light";

  const toggleLightDark = useCallback(() => {
    const next: ThemePreference = resolved === "dark" ? "light" : "dark";
    setPreference(next);
  }, [resolved, setPreference]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference, toggleLightDark }),
    [preference, resolved, setPreference, toggleLightDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
