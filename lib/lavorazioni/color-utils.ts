import type { CSSProperties } from "react";

const FALLBACK_BG = "#27272a";

/** Normalizza in #rrggbb minuscolo; null se non valido. */
export function normalizeHex(input: string | undefined | null): string | null {
  if (input == null) return null;
  let s = input.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (s.length === 3) {
    s = s
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return `#${s.toLowerCase()}`;
}

function channelToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
}

/** Luminanza relativa WCAG (0–1). */
export function relativeLuminance(hex: string): number {
  const n = normalizeHex(hex) ?? FALLBACK_BG;
  const r = channelToLinear(parseInt(n.slice(1, 3), 16));
  const g = channelToLinear(parseInt(n.slice(3, 5), 16));
  const b = channelToLinear(parseInt(n.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Testo leggibile su sfondo (quasi nero o quasi bianco). */
export function contrastTextOnBackground(bgHex: string): "#0a0a0a" | "#fafafa" {
  const L = relativeLuminance(normalizeHex(bgHex) ?? FALLBACK_BG);
  return L > 0.55 ? "#0a0a0a" : "#fafafa";
}

export function pillBorderOnBackground(bgHex: string): string {
  const L = relativeLuminance(normalizeHex(bgHex) ?? FALLBACK_BG);
  return L > 0.55 ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.22)";
}

/** Stile inline per pill/badge da colore configurato. */
export function pillStyleFromHex(bgHex: string | undefined | null): CSSProperties {
  const bg = normalizeHex(bgHex) ?? FALLBACK_BG;
  return {
    backgroundColor: bg,
    color: contrastTextOnBackground(bg),
    borderColor: pillBorderOnBackground(bg),
    transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  };
}

export function safeHex(bgHex: string | undefined | null): string {
  return normalizeHex(bgHex) ?? FALLBACK_BG;
}
