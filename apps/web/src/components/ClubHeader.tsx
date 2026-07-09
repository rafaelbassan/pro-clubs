import type { ClubSummary, MatchRecord } from "@/lib/api";
import { Locale, resultLabel, t } from "@/lib/i18n";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function FormGuide({ matches, locale }: { matches: MatchRecord[]; locale: Locale }) {
  const lastFive = [...matches]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 5);

  if (!lastFive.length) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pc-faint)]">
        {t(locale, "club.form")}
      </span>
      <div className="flex gap-1">
        {lastFive.map((m) => (
          <span
            key={m.match_id}
            className={`form-dot form-dot-${m.result.toLowerCase()}`}
            title={`${m.opponent_name} · ${m.score} · ${resultLabel(locale, m.result)}`}
          >
            {resultLabel(locale, m.result)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ClubHeader({
  summary,
  matches = [],
  locale,
}: {
  summary: ClubSummary;
  matches?: MatchRecord[];
  locale: Locale;
}) {
  const name = summary.name || t(locale, "club.fallback_name");

  return (
    <div className="pc-card mb-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[var(--pc-accent-border)] bg-gradient-to-br from-[var(--pc-accent-soft)] to-transparent font-[family-name:var(--font-display)] text-xl font-bold text-[var(--pc-accent)]">
          {initials(name) || "?"}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl md:text-3xl">{name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--pc-muted)]">
            <span className="mono text-[var(--pc-faint)]">#{summary.club_id}</span>
            {summary.stadium && <span>🏟 {summary.stadium}</span>}
            {summary.platform && <span className="uppercase tracking-wide">{summary.platform}</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:flex-col sm:items-end">
        <div className="flex items-center gap-2">
          <span className="chip">
            <span className="text-[var(--pc-faint)]">{t(locale, "club.division")}</span>
            <strong className="text-[var(--pc-accent)]">{summary.current_division || "—"}</strong>
          </span>
          {summary.best_division > 0 && summary.best_division !== summary.current_division && (
            <span className="chip">
              <span className="text-[var(--pc-faint)]">{t(locale, "club.best_division")}</span>
              <strong>{summary.best_division}</strong>
            </span>
          )}
        </div>
        <FormGuide matches={matches} locale={locale} />
      </div>
    </div>
  );
}
