import { Info } from "lucide-react";
import type { ClubResponse } from "@/lib/api";
import { Locale, t } from "@/lib/i18n";
import { ClubHeader } from "@/components/ClubHeader";
import { FormChart, MatchTypeChart, ResultsPie } from "@/components/Charts";
import { ExtraMetrics, StatsRow } from "@/components/Metrics";
import { MatchesTable } from "@/components/MatchesTable";
import { SquadSection } from "@/components/SquadSection";

function MetaNotice({ text }: { text: string }) {
  return (
    <p className="my-4 flex items-center gap-2 rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] px-4 py-2.5 text-xs text-[var(--pc-muted)]">
      <Info size={14} className="shrink-0 text-[var(--pc-accent)]" />
      {text}
    </p>
  );
}

export function ClubDashboard({
  data,
  locale,
  historyMode = false,
}: {
  data: ClubResponse;
  locale: Locale;
  historyMode?: boolean;
}) {
  return (
    <div className="animate-rise">
      <ClubHeader summary={data.summary} matches={data.matches} locale={locale} />
      <StatsRow summary={data.summary} locale={locale} />

      {data.meta.filtered_to === "last_5" && (
        <MetaNotice
          text={t(locale, "meta.last_5_count", {
            shown: data.matches.length,
            total: data.meta.total_matches,
          })}
        />
      )}
      {data.meta.filtered_to === "today" && (
        <MetaNotice
          text={
            historyMode
              ? t(locale, "meta.history_count", { count: data.meta.total_matches })
              : t(locale, "meta.today_count", { count: data.matches.length })
          }
        />
      )}
      {data.meta.filtered_to === "recent" && (
        <MetaNotice
          text={t(locale, "meta.recent_fallback", {
            shown: data.matches.length,
            total: data.meta.total_matches,
          })}
        />
      )}

      <div className="my-5 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <FormChart matches={data.matches} locale={locale} />
        </div>
        <div className="lg:col-span-2">
          <ResultsPie matches={data.matches} locale={locale} />
        </div>
      </div>
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <MatchTypeChart matches={data.matches} locale={locale} />
        <ExtraMetrics matches={data.matches} locale={locale} />
      </div>
      <SquadSection
        squad={data.squad ?? []}
        locale={locale}
        totalMatches={data.meta.total_matches}
      />
      <MatchesTable matches={data.matches} locale={locale} />
    </div>
  );
}
