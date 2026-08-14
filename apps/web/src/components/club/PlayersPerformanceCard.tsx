"use client";

import type { ReactNode } from "react";
import { Crown, Hand, Shield, Target, Zap } from "lucide-react";
import type { ClubAnalytics, ClubSummary, PlayerStats } from "@/lib/api";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";
import { IgBar, IgBrickBar, IgRing } from "@/components/club/IgPrimitives";

function perGame(value: number, apps: number) {
  return apps > 0 ? Math.round((value / apps) * 100) / 100 : 0;
}

function topBy<T>(items: T[], score: (item: T) => number, limit = 5) {
  return [...items].sort((a, b) => score(b) - score(a) || 0).slice(0, limit);
}

function isKeeper(p: PlayerStats) {
  const pos = (p.pos || "").toLowerCase();
  return pos.includes("gk") || pos.includes("goal") || (p.saves || 0) > 0;
}

function RankRow({
  rank,
  name,
  meta,
  right,
  bar,
  gold,
}: {
  rank: number;
  name: string;
  meta?: string;
  right?: ReactNode;
  bar?: ReactNode;
  gold?: boolean;
}) {
  return (
    <div className="space-y-1 border-b border-[var(--pc-border)] py-2 last:border-0">
      <div className="flex items-center gap-2">
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-bold ${
            gold ? "bg-[var(--pc-draw-soft)] text-[var(--pc-draw)]" : "bg-[var(--pc-accent-soft)] text-[var(--pc-accent)]"
          }`}
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold uppercase tracking-wide">{name}</div>
          {meta && <div className="text-[10px] text-[var(--pc-muted)]">{meta}</div>}
        </div>
        {right}
      </div>
      {bar}
    </div>
  );
}

export function PlayersPerformanceCard({
  summary,
  analytics,
  periodLabel,
}: {
  summary: ClubSummary;
  analytics: ClubAnalytics;
  periodLabel: string;
}) {
  const { locale } = useLocale();
  const squad = (analytics.squad || []).filter((p) => (p.appearances || 0) > 0);
  const gamesLabel = (n: number) =>
    locale === "pt" ? `${n} jogos` : `${n} games`;

  const offensive = topBy(
    squad,
    (p) => perGame((p.goals || 0) + (p.assists || 0), p.appearances),
  );
  const maxInfl = Math.max(
    ...offensive.map((p) => perGame((p.goals || 0) + (p.assists || 0), p.appearances)),
    0.01,
  );

  const mvp = topBy(squad, (p) => p.mom || 0);
  const mvpLeader = mvp[0];

  const ratings = topBy(squad, (p) => p.avg_rating || 0);

  const passers = topBy(squad, (p) => perGame(p.passes_made || 0, p.appearances));
  const maxPass = Math.max(...passers.map((p) => perGame(p.passes_made || 0, p.appearances)), 0.01);

  const wall = topBy(squad, (p) => perGame(p.tackles_made || 0, p.appearances));
  const maxWall = Math.max(...wall.map((p) => perGame(p.tackles_made || 0, p.appearances)), 0.01);

  const pressure = topBy(
    squad.filter((p) => (p.pass_attempts || 0) >= 5),
    (p) => p.pass_accuracy || 0,
  );

  const keepers = topBy(
    squad.filter(isKeeper),
    (p) => p.saves || 0,
  );
  const gk = keepers[0];
  const gkSaveRate =
    gk && analytics.goals_against + (gk.saves || 0) > 0
      ? Math.round(((gk.saves || 0) / ((gk.saves || 0) + analytics.goals_against)) * 1000) / 10
      : 0;

  const initials = summary.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <article className="ig-card">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-[var(--pc-accent-border)] bg-[var(--pc-accent-soft)]">
            {summary.crest_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={summary.crest_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-extrabold text-[var(--pc-accent)]">{initials || "?"}</span>
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--pc-accent)]">
              {summary.name}
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight md:text-xl">
              {t(locale, "ig.players_title")}
            </h2>
          </div>
        </div>
        <span className="ig-pill">{periodLabel}</span>
      </header>

      <div className="grid gap-2 lg:grid-cols-2">
        <div className="ig-panel">
          <div className="mb-1 flex items-center gap-1.5">
            <Zap size={13} className="text-[var(--pc-accent)]" />
            <span className="ig-label !text-[var(--pc-accent)]">1. {t(locale, "ig.offensive_leaders")}</span>
          </div>
          <div className="mb-1 text-right text-[9px] uppercase tracking-wider text-[var(--pc-muted)]">
            {t(locale, "ig.influence")} · G · A
          </div>
          {offensive.length === 0 && (
            <p className="py-3 text-xs text-[var(--pc-muted)]">{t(locale, "common.no_data")}</p>
          )}
          {offensive.map((p, i) => {
            const infl = perGame((p.goals || 0) + (p.assists || 0), p.appearances);
            return (
              <RankRow
                key={p.player_id}
                rank={i + 1}
                name={p.name}
                meta={gamesLabel(p.appearances)}
                gold={i === 0}
                right={
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className={i === 0 ? "text-[var(--pc-draw)]" : "text-[var(--pc-accent)]"}>
                      {infl.toFixed(2)}
                    </span>
                    <span className="w-5 text-center text-[var(--pc-text)]">{p.goals}</span>
                    <span className="w-5 text-center text-[var(--pc-muted)]">{p.assists}</span>
                  </div>
                }
                bar={<IgBar value={infl} max={maxInfl} gold={i === 0} />}
              />
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="ig-panel ig-panel-gold">
            <div className="mb-2 flex items-center gap-1.5">
              <Crown size={13} className="text-[var(--pc-draw)]" />
              <span className="ig-label !text-[var(--pc-draw)]">2. MVP</span>
            </div>
            {mvpLeader ? (
              <div className="flex gap-3">
                <div className="flex min-w-[42%] flex-col items-center justify-center rounded-xl border border-[rgba(184,134,11,0.28)] bg-[var(--pc-surface)] px-2 py-3 text-center">
                  <Crown size={22} className="text-[var(--pc-draw)]" />
                  <div className="ig-value mt-1 text-3xl text-[var(--pc-draw)]">{mvpLeader.mom}</div>
                  <div className="ig-label !text-[var(--pc-draw)]">MVPs</div>
                  <div className="mt-2 text-[11px] font-bold uppercase tracking-wide">
                    {mvpLeader.name}
                  </div>
                  <div className="text-[10px] text-[var(--pc-muted)]">{gamesLabel(mvpLeader.appearances)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  {mvp.slice(0, 5).map((p, i) => (
                    <div
                      key={p.player_id}
                      className="flex items-center justify-between border-b border-[var(--pc-border)] py-1.5 text-xs last:border-0"
                    >
                      <span className="truncate">
                        <span className="mr-1.5 text-[var(--pc-draw)]">{i + 1}.</span>
                        {p.name}
                      </span>
                      <span className="mono shrink-0 font-bold text-[var(--pc-draw)]">{p.mom}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--pc-muted)]">{t(locale, "common.no_data")}</p>
            )}
          </div>

          <div className="ig-panel">
            <div className="ig-label mb-1">3. {t(locale, "ig.top_rating")}</div>
            {ratings.map((p, i) => (
              <div
                key={p.player_id}
                className="flex items-center justify-between border-b border-[var(--pc-border)] py-1.5 last:border-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">
                    <span className="mr-1 text-[var(--pc-accent)]">{i + 1}.</span>
                    {p.name}
                  </div>
                  <div className="text-[10px] text-[var(--pc-muted)]">{gamesLabel(p.appearances)}</div>
                </div>
                <div className="ig-value text-lg text-[var(--pc-accent)]">
                  {p.avg_rating.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ig-panel">
          <div className="mb-1 flex items-center gap-1.5">
            <Target size={13} className="text-[var(--pc-accent)]" />
            <span className="ig-label !text-[var(--pc-accent)]">4. {t(locale, "ig.pass_architects")}</span>
          </div>
          {passers.map((p, i) => {
            const pg = perGame(p.passes_made || 0, p.appearances);
            return (
              <RankRow
                key={p.player_id}
                rank={i + 1}
                name={p.name}
                meta={gamesLabel(p.appearances)}
                gold={i === 0}
                right={
                  <div className="flex items-center gap-2">
                    <span className="mono text-xs font-bold text-[var(--pc-accent)]">{pg.toFixed(1)}</span>
                    <IgRing value={p.pass_accuracy || 0} size={36} stroke={4} gold={i === 0}>
                      <span className="text-[8px] font-bold">{Math.round(p.pass_accuracy || 0)}</span>
                    </IgRing>
                  </div>
                }
                bar={<IgBar value={pg} max={maxPass} gold={i === 0} />}
              />
            );
          })}
        </div>

        <div className="ig-panel">
          <div className="mb-1 flex items-center gap-1.5">
            <Shield size={13} className="text-[var(--pc-accent)]" />
            <span className="ig-label !text-[var(--pc-accent)]">5. {t(locale, "ig.wall")}</span>
          </div>
          {wall.map((p, i) => {
            const pg = perGame(p.tackles_made || 0, p.appearances);
            return (
              <RankRow
                key={p.player_id}
                rank={i + 1}
                name={p.name}
                meta={gamesLabel(p.appearances)}
                gold={i === 0}
                right={
                  <span className={`mono text-xs font-bold ${i === 0 ? "text-[var(--pc-draw)]" : "text-[var(--pc-accent)]"}`}>
                    {pg.toFixed(2)}
                  </span>
                }
                bar={<IgBrickBar value={pg} max={maxWall} gold={i === 0} />}
              />
            );
          })}
        </div>

        <div className="ig-panel lg:col-span-2">
          <div className="ig-label mb-1">6. {t(locale, "ig.pass_pressure")}</div>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {pressure.map((p, i) => (
              <RankRow
                key={p.player_id}
                rank={i + 1}
                name={p.name}
                meta={gamesLabel(p.appearances)}
                gold={i === 0}
                right={
                  <div className="text-right text-[10px]">
                    <div className={`mono font-bold ${i === 0 ? "text-[var(--pc-draw)]" : "text-[var(--pc-accent)]"}`}>
                      {(p.pass_accuracy || 0).toFixed(1)}%
                    </div>
                    <div className="text-[var(--pc-muted)]">
                      {p.passes_made}/{p.pass_attempts}
                    </div>
                  </div>
                }
                bar={<IgBar value={p.pass_accuracy || 0} gold={i === 0} />}
              />
            ))}
          </div>
        </div>

        <div className="ig-panel ig-panel-gold lg:col-span-2">
          <div className="mb-2 flex items-center gap-1.5">
            <Hand size={13} className="text-[var(--pc-draw)]" />
            <span className="ig-label !text-[var(--pc-draw)]">7. {t(locale, "ig.goalkeepers")}</span>
          </div>
          {gk ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold uppercase tracking-wide">{gk.name}</div>
                <div className="text-[10px] text-[var(--pc-muted)]">{gamesLabel(gk.appearances)}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="ig-value text-3xl text-[var(--pc-draw)]">{gkSaveRate}%</div>
                  <div className="ig-label !text-[var(--pc-draw)]">{t(locale, "ig.save_rate")}</div>
                </div>
                <div className="text-center">
                  <div className="ig-value text-2xl">{gk.saves}</div>
                  <div className="ig-label">{t(locale, "ig.saves")}</div>
                </div>
                <div className="text-center">
                  <div className="ig-value text-2xl text-[var(--pc-loss)]">{analytics.goals_against}</div>
                  <div className="ig-label">{t(locale, "metrics.goals_against")}</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--pc-muted)]">{t(locale, "common.no_data")}</p>
          )}
        </div>
      </div>

      <div className="ig-footer justify-center">{t(locale, "ig.players_footer")}</div>
    </article>
  );
}
