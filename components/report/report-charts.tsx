"use client";

import type { YearForecastLinePoint } from "@/lib/report/lavorazioni-year-matrix";

const ORANGE = "#f97316";
const ZINC = "#71717a";
const SKY = "#0ea5e9";
const EMERALD = "#22c55e";

export function ReportYearlyForecastLineChart({
  solid,
  dashed,
  forecastYear,
  forecastYearEnd,
}: {
  solid: YearForecastLinePoint[];
  dashed: YearForecastLinePoint[];
  forecastYear: number;
  forecastYearEnd: number | null;
}) {
  const W = 720;
  const H = 260;
  const padL = 44;
  const padR = 16;
  const padT = 20;
  const padB = 58;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const allPts = [...solid, ...dashed.filter((p) => p.kind === "forecast")];
  const xs = allPts.map((p) => p.x);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1;
  const spanX = Math.max(1e-6, maxX - minX);
  const maxY = Math.max(1, ...allPts.map((p) => p.value));

  const xy = (p: YearForecastLinePoint) => {
    const px = padL + ((p.x - minX) / spanX) * innerW;
    const py = padT + innerH - (p.value / maxY) * innerH;
    return { px, py };
  };

  const lineStr = (pts: YearForecastLinePoint[]) =>
    pts.map((p) => {
      const { px, py } = xy(p);
      return `${px},${py}`;
    }).join(" ");

  const gridY = [0, 0.25, 0.5, 0.75, 1].map((t) => padT + innerH * (1 - t));

  const labelFor = (p: YearForecastLinePoint) => {
    if (p.kind === "forecast" && forecastYearEnd != null) {
      return `Anno ${forecastYear} previsto: ${forecastYearEnd} lavorazioni`;
    }
    return `${p.label}: ${p.value}`;
  };

  const solidForLine = solid.length === 1 && solid[0] ? [solid[0], { ...solid[0], x: solid[0].x + 0.08 }] : solid;
  const solidD = solidForLine.length ? lineStr(solidForLine) : "";
  const dashedD = dashed.length >= 2 ? lineStr(dashed) : "";

  const dot = (p: YearForecastLinePoint, fill: string, stroke?: string) => {
    const { px, py } = xy(p);
    return (
      <circle key={`${p.kind}-${p.x}-${p.value}`} cx={px} cy={py} r={p.kind === "forecast" ? 5 : 4} fill={fill} stroke={stroke} strokeWidth={stroke ? 2 : 0}>
        <title>{labelFor(p)}</title>
      </circle>
    );
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full max-w-full" role="img" aria-label="Andamento annuale lavorazioni e previsione">
      {gridY.map((gy) => (
        <line key={gy} x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="currentColor" className="text-zinc-100 dark:text-zinc-800/90" strokeDasharray="3 5" />
      ))}
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
      {solidD ? <polyline fill="none" stroke={SKY} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={solidD} /> : null}
      {dashedD ? (
        <polyline fill="none" stroke={ORANGE} strokeWidth={2.5} strokeDasharray="7 5" strokeLinejoin="round" strokeLinecap="round" points={dashedD} />
      ) : null}
      {solid.map((p) => dot(p, p.kind === "ytd" ? SKY : ZINC))}
      {dashed.length >= 2 ? dot(dashed[dashed.length - 1]!, ORANGE, "#fff") : null}
      {solid.map((p) => {
        const { px } = xy(p);
        return (
          <text key={`t-${p.kind}-${p.year}-${p.x}`} x={px} y={H - 8} textAnchor="middle" className="fill-zinc-600 dark:fill-zinc-300" style={{ fontSize: 13, fontWeight: 600 }}>
            {p.kind === "history" ? String(p.year) : p.kind === "ytd" ? `${p.year}` : ""}
          </text>
        );
      })}
      {dashed.length >= 2 ? (
        <text
          x={xy(dashed[dashed.length - 1]!).px}
          y={H - 8}
          textAnchor="middle"
          className="fill-orange-600 dark:fill-orange-400"
          style={{ fontSize: 11 }}
        >
          stima
        </text>
      ) : null}
    </svg>
  );
}

export function MagazzinoEntrateUsciteBars({
  rows,
}: {
  rows: { label: string; entrate: number; uscite: number }[];
}) {
  const W = 720;
  const H = 220;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 48;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = Math.max(rows.length, 1);
  const maxY = Math.max(1, ...rows.flatMap((r) => [r.entrate, r.uscite]));
  const bw = innerW / n;
  const w = Math.min(16, bw * 0.28);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full max-w-full" role="img" aria-label="Entrate vs uscite">
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
      {rows.map((r, i) => {
        const cx = padL + bw * i + bw / 2;
        const he = (r.entrate / maxY) * innerH;
        const hu = (r.uscite / maxY) * innerH;
        const base = padT + innerH;
        return (
          <g key={r.label}>
            <rect x={cx - w - 2} y={base - he} width={w} height={he} fill={EMERALD} rx={2}>
              <title>{`Entrate: ${r.entrate}`}</title>
            </rect>
            <rect x={cx + 2} y={base - hu} width={w} height={hu} fill={ORANGE} rx={2}>
              <title>{`Uscite: ${r.uscite}`}</title>
            </rect>
            <text x={cx} y={H - 10} textAnchor="middle" className="fill-zinc-500" style={{ fontSize: 9 }}>
              {r.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MagazzinoCapitalLineChart({ rows }: { rows: { label: string; capitaleFinale: number }[] }) {
  const W = 720;
  const H = 240;
  const padL = 48;
  const padR = 14;
  const padT = 16;
  const padB = 50;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = Math.max(rows.length, 1);
  const pts = rows.map((r, i) => ({ x: i, value: r.capitaleFinale, label: r.label }));
  const maxY = Math.max(1, ...pts.map((p) => p.value));
  const d = pts
    .map((p, i) => {
      const px = padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const py = padT + innerH - (p.value / maxY) * innerH;
      return `${i === 0 ? "M" : "L"}${px},${py}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full max-w-full" role="img" aria-label="Andamento capitale immobilizzato">
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
      {d ? <path d={d} fill="none" stroke={ORANGE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.95} /> : null}
      {pts.map((p, i) => {
        const px = padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
        const py = padT + innerH - (p.value / maxY) * innerH;
        const last = i === pts.length - 1;
        const eur = p.value.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
        return (
          <g key={p.label}>
            <circle cx={px} cy={py} r={last ? 6 : 3.5} fill={last ? ORANGE : "#fff"} stroke={ORANGE} strokeWidth={last ? 2 : 1.5} className={last ? "" : "dark:fill-zinc-900"}>
              <title>{last ? `Capitale attuale (${p.label}): ${eur}` : `${p.label}: ${eur}`}</title>
            </circle>
            <text x={px} y={H - 8} textAnchor="middle" className="fill-zinc-500" style={{ fontSize: 9 }}>
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
