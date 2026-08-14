"use client";

import type { ReactNode } from "react";

export function IgRing({
  value,
  size = 72,
  stroke = 7,
  gold = false,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  gold?: boolean;
  children?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, value || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color = gold ? "var(--pc-draw)" : "var(--pc-accent)";
  return (
    <div className="ig-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(20,36,26,0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="relative z-[1] text-center">{children}</div>
    </div>
  );
}

export function IgBar({
  value,
  max = 100,
  gold = false,
}: {
  value: number;
  max?: number;
  gold?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`ig-bar ${gold ? "ig-bar-gold" : ""}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function IgBrickBar({
  value,
  max = 100,
  segments = 12,
  gold = false,
}: {
  value: number;
  max?: number;
  segments?: number;
  gold?: boolean;
}) {
  const filled = Math.round((Math.max(0, Math.min(max, value)) / (max || 1)) * segments);
  return (
    <div className={`ig-brick ${gold ? "ig-brick-gold" : ""}`}>
      {Array.from({ length: segments }).map((_, i) => (
        <i key={i} className={i < filled ? "on" : ""} />
      ))}
    </div>
  );
}

export function formatPeriodLabel(
  locale: "pt" | "en",
  opts: { dateFrom?: string; dateTo?: string; lastN?: number | null; matches?: number },
) {
  const fmt = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };
  if (opts.dateFrom || opts.dateTo) {
    const a = fmt(opts.dateFrom) || "…";
    const b = fmt(opts.dateTo) || "…";
    return locale === "pt" ? `${a} a ${b}` : `${a} – ${b}`;
  }
  if (opts.lastN) {
    return locale === "pt" ? `Últimas ${opts.lastN} partidas` : `Last ${opts.lastN} matches`;
  }
  if (opts.matches) {
    return locale === "pt" ? `${opts.matches} partidas sincronizadas` : `${opts.matches} synced matches`;
  }
  return locale === "pt" ? "Período completo" : "Full period";
}
