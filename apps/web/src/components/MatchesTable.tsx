import type { MatchRecord } from "@/lib/api";
import { Locale, matchTypeLabel, resultLabel, t } from "@/lib/i18n";

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";
  const d = new Date(value);
  const loc = locale === "pt" ? "pt-BR" : "en-US";
  return `${d.toLocaleDateString(loc, { day: "2-digit", month: "short" })} · ${d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}`;
}

function ScoreCell({ match }: { match: MatchRecord }) {
  return (
    <span className="mono tabular-nums text-sm font-semibold">
      <span className={match.result === "V" ? "text-[var(--pc-win)]" : ""}>{match.club_goals}</span>
      <span className="mx-1 text-[var(--pc-faint)]">–</span>
      <span className={match.result === "D" ? "text-[var(--pc-loss)]" : ""}>{match.opponent_goals}</span>
    </span>
  );
}

export function MatchesTable({ matches, locale }: { matches: MatchRecord[]; locale: Locale }) {
  if (!matches.length) {
    return (
      <div className="pc-card text-center text-sm text-[var(--pc-muted)]">
        {t(locale, "table.empty")}
      </div>
    );
  }

  const sorted = [...matches].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
  );

  return (
    <div className="pc-card !p-0">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-[15px] font-semibold">{t(locale, "table.title")}</h3>
        <span className="text-xs text-[var(--pc-faint)]">
          {sorted.length} {t(locale, "table.count_suffix")}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--pc-border)] text-left text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--pc-faint)]">
              <th className="px-5 py-2.5 font-medium">{t(locale, "table.result")}</th>
              <th className="px-3 py-2.5 font-medium">{t(locale, "table.opponent")}</th>
              <th className="px-3 py-2.5 font-medium">{t(locale, "table.score")}</th>
              <th className="hidden px-3 py-2.5 font-medium sm:table-cell">{t(locale, "table.type")}</th>
              <th className="hidden px-3 py-2.5 font-medium md:table-cell">{t(locale, "table.date")}</th>
              <th className="hidden px-5 py-2.5 font-medium lg:table-cell">{t(locale, "table.stadium")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr
                key={m.match_id}
                className="border-b border-[var(--pc-border)] transition last:border-b-0 hover:bg-[var(--pc-surface-hover)]"
              >
                <td className="px-5 py-3">
                  <span className={`badge-result badge-result-${m.result.toLowerCase()}`}>
                    {resultLabel(locale, m.result)}
                  </span>
                </td>
                <td className="max-w-[200px] truncate px-3 py-3 font-medium">{m.opponent_name}</td>
                <td className="px-3 py-3">
                  <ScoreCell match={m} />
                </td>
                <td className="hidden px-3 py-3 text-[var(--pc-muted)] sm:table-cell">
                  {matchTypeLabel(locale, m.match_type)}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-[var(--pc-muted)] md:table-cell">
                  {formatDate(m.date, locale)}
                </td>
                <td className="hidden max-w-[220px] truncate px-5 py-3 text-[var(--pc-muted)] lg:table-cell">
                  {m.stadium || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
