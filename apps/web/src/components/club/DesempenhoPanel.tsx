"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import type { ClubAnalytics, MatchRecord } from "@/lib/api";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

type SubTab = "visao" | "resultados" | "confrontos";

function Gauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="pc-card flex flex-col items-center justify-center py-4">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--pc-border)" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke="var(--pc-accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
        />
        <text
          x="48"
          y="52"
          textAnchor="middle"
          className="fill-[var(--pc-text)] font-[family-name:var(--font-display)] text-sm font-bold"
        >
          {Number.isInteger(clamped) ? clamped : clamped.toFixed(1)}%
        </text>
      </svg>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--pc-muted)]">
        {label}
      </span>
    </div>
  );
}

function StatCard({
  value,
  label,
  tone = "default",
}: {
  value: string | number;
  label: string;
  tone?: "win" | "loss" | "default";
}) {
  const color =
    tone === "win" ? "text-[var(--pc-win)]" : tone === "loss" ? "text-[var(--pc-loss)]" : "text-[var(--pc-text)]";
  return (
    <div className="pc-card !p-3">
      <div className={`mono text-xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--pc-muted)]">
        {label}
      </div>
    </div>
  );
}

export function DesempenhoPanel({
  analytics,
  loading,
  clubMatches,
}: {
  analytics: ClubAnalytics | null;
  loading: boolean;
  clubMatches: MatchRecord[];
}) {
  const { locale } = useLocale();
  const [sub, setSub] = useState<SubTab>("visao");

  if (loading && !analytics) {
    return <div className="pc-card text-sm text-[var(--pc-muted)]">{t(locale, "common.loading")}</div>;
  }
  if (!analytics) {
    return <div className="pc-card text-sm text-[var(--pc-muted)]">{t(locale, "common.no_data")}</div>;
  }

  const subs: { id: SubTab; key: string }[] = [
    { id: "visao", key: "desempenho.overview" },
    { id: "resultados", key: "desempenho.results" },
    { id: "confrontos", key: "desempenho.matchups" },
  ];

  const barData = analytics.match_bars.map((m) => ({
    ...m,
    height: Math.max(m.club_goals, m.opponent_goals, 1) + (m.rating || 0) / 10,
    label: m.date ? m.date.slice(5, 10).replace("-", "/") : m.score,
  }));

  return (
    <div>
      <div className="pc-tablist mb-4">
        {subs.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSub(s.id)}
            className={`pc-tab ${sub === s.id ? "pc-tab-active" : ""}`}
          >
            {t(locale, s.key)}
          </button>
        ))}
      </div>

      {sub === "visao" && (
        <div className="space-y-4">
          <div className="pc-card !py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-center">
                <div className="mono text-lg font-bold">
                  <span className="text-[var(--pc-win)]">{analytics.wins}</span>
                  <span className="text-[var(--pc-faint)]"> / </span>
                  <span className="text-[var(--pc-draw)]">{analytics.draws}</span>
                  <span className="text-[var(--pc-faint)]"> / </span>
                  <span className="text-[var(--pc-loss)]">{analytics.losses}</span>
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--pc-muted)]">
                  V · E · D
                </div>
              </div>
              <div className="text-center">
                <div className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--pc-accent)]">
                  {analytics.win_rate}%
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--pc-muted)]">
                  {t(locale, "metrics.win_rate")}
                </div>
              </div>
              <div className="text-center">
                <div className="mono text-2xl font-bold">{analytics.matches}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--pc-muted)]">
                  {t(locale, "desempenho.matches")}
                </div>
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--pc-surface-muted)]">
              <div
                className="h-full rounded-full bg-[var(--pc-accent)]"
                style={{ width: `${Math.max(0, Math.min(100, analytics.win_rate))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard value={analytics.goals_for} label={t(locale, "desempenho.goals_for")} tone="win" />
            <StatCard value={analytics.goals_against} label={t(locale, "desempenho.goals_against")} tone="loss" />
            <StatCard
              value={`${analytics.goal_diff >= 0 ? "+" : ""}${analytics.goal_diff}`}
              label={t(locale, "desempenho.goal_diff")}
              tone={analytics.goal_diff >= 0 ? "win" : "loss"}
            />
            <StatCard value={analytics.clean_sheets} label={t(locale, "desempenho.clean_sheets")} />
            <StatCard value={analytics.goals_per_game} label={t(locale, "desempenho.goals_pg")} />
            <StatCard value={analytics.shots_per_game} label={t(locale, "desempenho.shots_pg")} />
            <StatCard value={`${analytics.pass_accuracy}%`} label={t(locale, "desempenho.pass_pct")} />
            <StatCard value={`${analytics.duel_accuracy}%`} label={t(locale, "desempenho.duel_pct")} />
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Gauge value={analytics.win_rate} label={t(locale, "metrics.win_rate")} />
            <Gauge value={analytics.pass_accuracy} label={t(locale, "desempenho.pass_pct")} />
            <Gauge value={analytics.duel_accuracy} label={t(locale, "desempenho.duel_pct")} />
            <Gauge value={analytics.offensiveness} label={t(locale, "desempenho.offensiveness")} />
          </div>

          <div className="pc-card flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--pc-draw-soft)] text-sm font-bold text-[var(--pc-draw)]">
              {analytics.best_streak}
            </span>
            <div>
              <div className="text-sm font-semibold">{t(locale, "desempenho.best_streak")}</div>
              <div className="text-xs text-[var(--pc-muted)]">{t(locale, "desempenho.best_streak_hint")}</div>
            </div>
          </div>
        </div>
      )}

      {sub === "resultados" && (
        <div className="space-y-2">
          {(analytics.match_bars.length ? analytics.match_bars : clubMatches).length === 0 && (
            <div className="pc-card text-sm text-[var(--pc-muted)]">{t(locale, "table.empty")}</div>
          )}
          {[...analytics.match_bars].reverse().map((m) => (
            <div
              key={m.match_id}
              className="pc-card flex items-center justify-between !py-3"
              style={{
                borderLeft: `3px solid ${
                  m.result === "V" ? "var(--pc-win)" : m.result === "D" ? "var(--pc-loss)" : "var(--pc-draw)"
                }`,
              }}
            >
              <div>
                <div className="mono text-lg font-bold">{m.score}</div>
                <div className="text-xs text-[var(--pc-muted)]">
                  {m.date ? new Date(m.date).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US") : "—"}
                </div>
              </div>
              <span className={`badge-result badge-result-${m.result.toLowerCase()}`}>{m.result}</span>
            </div>
          ))}
        </div>
      )}

      {sub === "confrontos" && (
        <div className="space-y-4">
          <div>
            <h3 className="pc-section-label mb-2">{t(locale, "desempenho.avg_by_opponent")}</h3>
            <div className="pc-card space-y-2 !p-3">
              {analytics.opponent_averages.length === 0 && (
                <p className="text-sm text-[var(--pc-muted)]">{t(locale, "common.no_data")}</p>
              )}
              {analytics.opponent_averages.map((o) => (
                <div key={o.opponent_name} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{o.opponent_name}</div>
                    <div className="text-[10px] text-[var(--pc-faint)]">{o.matches}J</div>
                  </div>
                  <div className="mono shrink-0 text-xs">
                    <span className="text-[var(--pc-win)]">{o.avg_goals_for} pró</span>
                    {" · "}
                    <span className="text-[var(--pc-loss)]">{o.avg_goals_against} sof</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="pc-section-label mb-2">{t(locale, "desempenho.per_match")}</h3>
            <div className="pc-card h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="label" tick={{ fill: "#5c7266", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #dce5de",
                      borderRadius: 8,
                      color: "#14241a",
                    }}
                  />
                  <Bar dataKey="height" radius={[4, 4, 0, 0]}>
                    {barData.map((entry) => (
                      <Cell
                        key={entry.match_id}
                        fill={
                          entry.result === "V"
                            ? "#157a45"
                            : entry.result === "D"
                              ? "#c2414a"
                              : "#b8860b"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
