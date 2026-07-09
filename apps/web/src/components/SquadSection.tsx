import type { PlayerStats } from "@/lib/api";
import { Locale, t } from "@/lib/i18n";
import { SquadHighlights } from "@/components/SquadHighlights";
import { SquadTable } from "@/components/SquadTable";

export function SquadSection({
  squad,
  locale,
  totalMatches,
}: {
  squad: PlayerStats[];
  locale: Locale;
  totalMatches: number;
}) {
  if (!squad.length) {
    return (
      <div className="mb-5">
        <p className="pc-section-label mb-3">{t(locale, "squad.title")}</p>
        <div className="pc-card text-center text-sm text-[var(--pc-muted)]">
          {t(locale, "squad.empty")}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <p className="pc-section-label">{t(locale, "squad.title")}</p>
        {totalMatches > 0 && (
          <span className="text-xs text-[var(--pc-faint)]">
            {t(locale, "squad.scope_note", { matches: totalMatches })}
          </span>
        )}
      </div>
      <SquadHighlights squad={squad} locale={locale} />
      <div className="mt-4">
        <SquadTable squad={squad} locale={locale} />
      </div>
    </div>
  );
}
