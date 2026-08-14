"use client";

import { Calendar, Crosshair, Shield, Target } from "lucide-react";
import type { ClubAnalytics, ClubSummary, PlayerStats } from "@/lib/api";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";
import { IgBar, IgRing } from "@/components/club/IgPrimitives";

function sumSquad(squad: PlayerStats[]) {
  return squad.reduce(
    (acc, p) => {
      acc.assists += p.assists || 0;
      acc.shots += p.shots || 0;
      acc.passesMade += p.passes_made || 0;
      acc.passAttempts += p.pass_attempts || 0;
      acc.tacklesMade += p.tackles_made || 0;
      acc.tackleAttempts += p.tackle_attempts || 0;
      acc.saves += p.saves || 0;
      return acc;
    },
    {
      assists: 0,
      shots: 0,
      passesMade: 0,
      passAttempts: 0,
      tacklesMade: 0,
      tackleAttempts: 0,
      saves: 0,
    },
  );
}

function avg(n: number, games: number) {
  return games > 0 ? Math.round((n / games) * 10) / 10 : 0;
}

export function TeamPerformanceCard({
  summary,
  analytics,
  periodLabel,
}: {
  summary: ClubSummary;
  analytics: ClubAnalytics;
  periodLabel: string;
}) {
  const { locale } = useLocale();
  const n = analytics.matches || 1;
  const totals = sumSquad(analytics.squad || []);
  const shotAcc =
    totals.shots > 0 ? Math.round((analytics.goals_for / totals.shots) * 1000) / 10 : 0;
  const passAcc = analytics.pass_accuracy;
  const tackleAcc = analytics.duel_accuracy;
  const defendRate =
    analytics.matches > 0
      ? Math.round((analytics.clean_sheets / analytics.matches) * 1000) / 10
      : 0;

  const averages = [
    { label: t(locale, "ig.shots"), value: avg(totals.shots, n), max: 20 },
    { label: t(locale, "ig.passes"), value: avg(totals.passesMade, n), max: 120 },
    { label: t(locale, "ig.tackles"), value: avg(totals.tacklesMade, n), max: 20 },
    { label: t(locale, "ig.assists"), value: avg(totals.assists, n), max: 5 },
    { label: t(locale, "ig.saves"), value: avg(totals.saves, n), max: 8 },
  ];

  const rings = [
    { label: t(locale, "ig.shot"), value: shotAcc },
    { label: t(locale, "ig.pass"), value: passAcc },
    { label: t(locale, "ig.tackle"), value: tackleAcc },
    { label: t(locale, "metrics.win_rate"), value: analytics.win_rate },
  ];

  const initials = summary.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <article className="ig-card">
      <header className="mb-4 text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-[var(--pc-accent-border)] bg-[var(--pc-accent-soft)]">
            {summary.crest_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={summary.crest_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--pc-accent)]">
              {initials || "?"}
            </span>
          )}
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight md:text-3xl">
          {summary.name}
        </h2>
        <div className="mt-2 flex justify-center">
          <span className="ig-pill">
            <Calendar size={12} />
            {periodLabel}
          </span>
        </div>
      </header>

      <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          { label: t(locale, "ig.games"), value: analytics.matches, tone: "text-[var(--pc-text)]" },
          { label: t(locale, "metrics.wins"), value: analytics.wins, tone: "text-[var(--pc-win)]" },
          { label: t(locale, "metrics.ties"), value: analytics.draws, tone: "text-[var(--pc-draw)]" },
          { label: t(locale, "metrics.losses"), value: analytics.losses, tone: "text-[var(--pc-loss)]" },
          {
            label: t(locale, "metrics.win_rate"),
            value: `${analytics.win_rate}%`,
            tone: "text-[var(--pc-accent)]",
          },
        ].map((item) => (
          <div key={item.label} className="ig-panel !p-2 text-center">
            <div className={`ig-value text-xl ${item.tone}`}>{item.value}</div>
            <div className="ig-label mt-1">{item.label}</div>
          </div>
        ))}
        <div className="ig-panel flex flex-col items-center justify-center !p-2">
          <IgRing value={passAcc} size={64} stroke={6}>
            <div className="ig-value text-sm">{passAcc}%</div>
          </IgRing>
          <div className="ig-label mt-1">{t(locale, "ig.pass_pct")}</div>
        </div>
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <div className="ig-panel">
          <div className="mb-2 flex items-center gap-1.5 text-[var(--pc-accent)]">
            <Crosshair size={14} />
            <span className="ig-label !text-[var(--pc-accent)]">{t(locale, "ig.attack")}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="ig-value text-3xl text-[var(--pc-win)]">{analytics.goals_for}</div>
              <div className="ig-label mt-1">{t(locale, "metrics.goals")}</div>
              <div className="mt-0.5 text-[10px] text-[var(--pc-muted)]">
                {analytics.goals_per_game} / {t(locale, "metrics.games")}
              </div>
            </div>
            <div>
              <div className="ig-value text-3xl text-[var(--pc-accent)]">{totals.assists}</div>
              <div className="ig-label mt-1">{t(locale, "ig.assists")}</div>
              <div className="mt-0.5 text-[10px] text-[var(--pc-muted)]">
                {avg(totals.assists, n)} / {t(locale, "metrics.games")}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px]">
              <span className="ig-label">{t(locale, "ig.shot_eff")}</span>
              <span className="font-bold text-[var(--pc-accent)]">{shotAcc}%</span>
            </div>
            <IgBar value={shotAcc} />
          </div>
        </div>

        <div className="ig-panel ig-panel-gold">
          <div className="mb-2 flex items-center gap-1.5 text-[var(--pc-draw)]">
            <Shield size={14} />
            <span className="ig-label !text-[var(--pc-draw)]">{t(locale, "ig.defense")}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="ig-value text-3xl text-[var(--pc-loss)]">{analytics.goals_against}</div>
              <div className="ig-label mt-1">{t(locale, "metrics.goals_against")}</div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-[rgba(184,134,11,0.28)] bg-[var(--pc-surface)] px-2 py-2">
              <Target size={14} className="text-[var(--pc-draw)]" />
              <div className="ig-value mt-1 text-2xl text-[var(--pc-draw)]">{analytics.clean_sheets}</div>
              <div className="ig-label mt-0.5 !text-[var(--pc-draw)]">{t(locale, "metrics.clean_sheets")}</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px]">
              <span className="ig-label">{t(locale, "ig.clean_rate")}</span>
              <span className="font-bold text-[var(--pc-draw)]">{defendRate}%</span>
            </div>
            <IgBar value={defendRate} gold />
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="ig-panel">
          <div className="ig-label mb-3">{t(locale, "ig.averages")}</div>
          <div className="space-y-2.5">
            {averages.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--pc-muted)]">{row.label}</span>
                  <span className="mono font-bold text-[var(--pc-text)]">{row.value}</span>
                </div>
                <IgBar value={row.value} max={row.max} />
              </div>
            ))}
          </div>
        </div>

        <div className="ig-panel">
          <div className="ig-label mb-3">{t(locale, "ig.accuracy")}</div>
          <div className="grid grid-cols-2 gap-3">
            {rings.map((r) => (
              <div key={r.label} className="flex flex-col items-center">
                <IgRing value={r.value} size={78} stroke={7}>
                  <div className="ig-value text-sm">{Number.isInteger(r.value) ? r.value : r.value.toFixed(1)}%</div>
                </IgRing>
                <div className="ig-label mt-1.5">{r.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ig-footer justify-center">{t(locale, "ig.team_footer")}</div>
    </article>
  );
}
