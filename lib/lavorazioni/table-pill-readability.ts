import type { CSSProperties } from "react";
import {
  contrastTextOnBackground,
  normalizeHex,
  pillBorderOnBackground,
  relativeLuminance,
} from "@/lib/lavorazioni/color-utils";

function parseRgb(hex: string): { r: number; g: number; b: number } {
  const n = normalizeHex(hex) ?? "#52525b";
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

function mixHex(fg: string, toward: string, t: number): string {
  const A = parseRgb(fg);
  const B = parseRgb(toward);
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const b = Math.round(A.b + (B.b - A.b) * t);
  const ch = (x: number) => x.toString(16).padStart(2, "0");
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

/**
 * Sfondo pill tabella Lavorazioni: schiarisce/scurisce fino a contrasto immediato
 * (sfondi troppo chiari su riga bianca → mix verso zinc-900).
 */
export function readablePillStyleFromHex(hex: string | undefined): CSSProperties {
  let mixed = normalizeHex(hex) ?? "#3f3f46";
  let L = relativeLuminance(mixed);
  let guard = 0;
  while (L > 0.46 && guard < 18) {
    mixed = mixHex(mixed, "#18181b", 0.24);
    L = relativeLuminance(mixed);
    guard++;
  }
  guard = 0;
  while (L < 0.07 && guard < 22) {
    mixed = mixHex(mixed, "#fafafa", 0.18);
    L = relativeLuminance(mixed);
    guard++;
  }
  const bg = normalizeHex(mixed) ?? "#3f3f46";
  return {
    backgroundColor: bg,
    color: contrastTextOnBackground(bg),
    borderColor: pillBorderOnBackground(bg),
    transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  };
}

export function readableBadgeStyle(hex: string | undefined): CSSProperties {
  return { ...readablePillStyleFromHex(hex), fontWeight: 600 };
}
