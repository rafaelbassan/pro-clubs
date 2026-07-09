import type { ClubSummary } from "@/lib/api";
import { Locale, t } from "@/lib/i18n";

type Tone = "win" | "loss" | "draw" | "accent" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  win: "text-[var(--pc-win)]",
  loss: "text-[var(--pc-loss)]",
  draw: "text-[var(--pc-draw)]",
  accent: "text-[var(--pc-accent)]",
  neutral: "text-[var(--pc-text)]",
};

function MetricCard({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="pc-card pc-card-hover flex flex-col gap-1 !p-4">
      <span className={`tabular-nums font-[family-name:var(--font-display)] text-[26px] font-bold leading-none ${TONE_CLASS[tone]}`}>
        {value}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--pc-muted)]">
        {label}
      </span>
      {hint && <span className="text-[10px] text-[var(--pc-faint)]">{hint}</span>}
    </div>
  );
}

export function StatsRow({ summary, locale }: { summary: ClubSummary; locale: Locale }) {
  const games = summary.games_played || summary.wins + summary.losses + summary.ties;
  const winRate = games ? Math.round((summary.wins / games) * 100) : 0;

  const stats: { label: string; value: string | number; tone: Tone; hint?: string }[] = [
    {
      label: t(locale, "metrics.wins"),
      value: summary.wins,
      tone: "win",
      hint: games ? `${winRate}% · ${games} ${t(locale, "metrics.games")}` : undefined,
    },
    { label: t(locale, "metrics.losses"), value: summary.losses, tone: "loss" },
    { label: t(locale, "metrics.ties"), value: summary.ties, tone: "draw" },
    { label: t(locale, "metrics.goals"), value: summary.goals, tone: "accent" },
    { label: t(locale, "metrics.goals_against"), value: summary.goals_against, tone: "neutral" },
    { label: t(locale, "metrics.clean_sheets"), value: summary.clean_sheets, tone: "accent" },
  ];

  return (
    <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((s) => (
        <MetricCard key={s.label} label={s.label} value={s.value} tone={s.tone} hint={s.hint} />
      ))}
    </div>
  );
}

export function ExtraMetrics({
  matches,
  locale,
}: {
  matches: { club_goals: number; opponent_goals: number; result: string }[];
  locale: Locale;
}) {
  if (!matches.length) return null;
  const goalDiff = matches.reduce((a, m) => a + m.club_goals - m.opponent_goals, 0);
  const winRate = (matches.filter((m) => m.result === "V").length / matches.length) * 100;
  const avgScored = matches.reduce((a, m) => a + m.club_goals, 0) / matches.length;
  const avgConceded = matches.reduce((a, m) => a + m.opponent_goals, 0) / matches.length;

  return (
    <div className="grid h-full grid-cols-2 gap-3">
      <MetricCard
        label={t(locale, "metrics.goal_diff")}
        value={goalDiff > 0 ? `+${goalDiff}` : goalDiff}
        tone={goalDiff > 0 ? "win" : goalDiff < 0 ? "loss" : "neutral"}
      />
      <MetricCard
        label={t(locale, "metrics.win_rate")}
        value={`${winRate.toFixed(0)}%`}
        tone={winRate >= 50 ? "win" : "draw"}
      />
      <MetricCard label={t(locale, "metrics.avg_scored")} value={avgScored.toFixed(1)} tone="accent" />
      <MetricCard label={t(locale, "metrics.avg_conceded")} value={avgConceded.toFixed(1)} tone="neutral" />
    </div>
  );
}
