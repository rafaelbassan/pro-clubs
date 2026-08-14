"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import type { ClubAnalytics, ClubSummary, MatchRecord } from "@/lib/api";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";
import { usePeriodFilter } from "@/components/club/PeriodFilter";
import { formatPeriodLabel } from "@/components/club/IgPrimitives";
import { TeamPerformanceCard } from "@/components/club/TeamPerformanceCard";
import { PlayersPerformanceCard } from "@/components/club/PlayersPerformanceCard";

type SubTab = "visao" | "jogadores" | "resultados" | "confrontos";

export function DesempenhoPanel({
  analytics,
  loading,
  clubMatches,
  summary,
}: {
  analytics: ClubAnalytics | null;
  loading: boolean;
  clubMatches: MatchRecord[];
  summary: ClubSummary;
}) {
  const { locale } = useLocale();
  const { filter } = usePeriodFilter();
  const [sub, setSub] = useState<SubTab>("visao");

  const periodLabel = useMemo(
    () =>
      formatPeriodLabel(locale, {
        dateFrom: filter.date_from,
        dateTo: filter.date_to,
        lastN: filter.last_n,
        matches: analytics?.matches,
      }),
    [locale, filter, analytics?.matches],
  );

  if (loading && !analytics) {
    return <div className="pc-card text-sm text-[var(--pc-muted)]">{t(locale, "common.loading")}</div>;
  }
  if (!analytics) {
    return <div className="pc-card text-sm text-[var(--pc-muted)]">{t(locale, "common.no_data")}</div>;
  }

  const subs: { id: SubTab; key: string }[] = [
    { id: "visao", key: "desempenho.overview" },
    { id: "jogadores", key: "desempenho.players_card" },
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
        <div className="space-y-3">
          <p className="text-xs text-[var(--pc-muted)]">{t(locale, "ig.share_hint")}</p>
          <TeamPerformanceCard summary={summary} analytics={analytics} periodLabel={periodLabel} />
        </div>
      )}

      {sub === "jogadores" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--pc-muted)]">{t(locale, "ig.share_hint")}</p>
          <PlayersPerformanceCard summary={summary} analytics={analytics} periodLabel={periodLabel} />
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
