"use client";

export function ReportSparkline({ values, className }: { values: number[]; className?: string }) {
  const h = 32;
  const w = 80;
  const v = values.length ? values : [0];
  const max = Math.max(...v, 1);
  const min = Math.min(...v, 0);
  const span = max - min || 1;
  const pts = v
    .map((val, i) => {
      const x = (i / Math.max(v.length - 1, 1)) * (w - 2) + 1;
      const y = h - 1 - ((val - min) / span) * (h - 2);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className={className} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.75" points={pts} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
