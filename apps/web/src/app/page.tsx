"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { BarChart3, ChevronRight, History, Loader2, Search, Shield, TrendingUp } from "lucide-react";
import { DEFAULT_CLUB_NAME, searchClubs, type ClubSearchResult } from "@/lib/api";
import { getRecentClubs, type RecentClub } from "@/lib/recentClubs";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

function DivisionBadge({ division }: { division: number }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--pc-accent-border)] bg-[var(--pc-accent-soft)]">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--pc-muted)]">Div</span>
      <span className="-mt-1 font-[family-name:var(--font-mono)] text-base font-bold text-[var(--pc-accent)]">
        {division || "?"}
      </span>
    </span>
  );
}

function ClubResultCard({ club, locale }: { club: ClubSearchResult; locale: "pt" | "en" }) {
  return (
    <Link
      href={`/clubs/${club.club_id}`}
      className="pc-card pc-card-hover group flex items-center gap-4"
    >
      <DivisionBadge division={club.current_division} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-[family-name:var(--font-display)] text-lg font-bold">
          {club.name}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--pc-muted)]">
          <span>
            <span className="font-semibold text-[var(--pc-win)]">{club.wins}</span>{" "}
            {t(locale, "results.code.V")}
          </span>
          <span>
            <span className="font-semibold text-[var(--pc-loss)]">{club.losses}</span>{" "}
            {t(locale, "results.code.D")}
          </span>
          <span>
            <span className="font-semibold text-[var(--pc-draw)]">{club.ties}</span>{" "}
            {t(locale, "results.code.E")}
          </span>
          {club.platform && <span className="uppercase tracking-wide">{club.platform}</span>}
        </div>
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 text-[var(--pc-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--pc-accent)]"
      />
    </Link>
  );
}

export default function HomePage() {
  const { locale } = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClubSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<RecentClub[]>([]);

  useEffect(() => {
    setRecent(getRecentClubs());
  }, []);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const clubs = await searchClubs(query.trim());
      setResults(clubs);
      setSearched(true);
      if (clubs.length === 1) router.push(`/clubs/${clubs[0].club_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "home.search_failed"));
    } finally {
      setLoading(false);
    }
  }

  const features = [
    [Search, "welcome.feature_search_title", "welcome.feature_search_desc"],
    [BarChart3, "welcome.feature_stats_title", "welcome.feature_stats_desc"],
    [TrendingUp, "welcome.feature_charts_title", "welcome.feature_charts_desc"],
  ] as const;

  return (
    <div className="animate-rise">
      {/* Hero */}
      <div className="mx-auto max-w-2xl pt-6 pb-10 text-center md:pt-14">
        <span className="chip mx-auto mb-5">
          <Shield size={13} className="text-[var(--pc-accent)]" />
          EA SPORTS FC 26 · Pro Clubs
        </span>
        <h1 className="text-4xl leading-tight md:text-6xl">
          {t(locale, "home.hero_prefix")}{" "}
          <span className="text-gradient">{t(locale, "home.hero_highlight")}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[var(--pc-muted)]">
          {t(locale, "app.subtitle")}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={onSearch} className="mx-auto mb-3 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pc-faint)]"
          />
          <input
            className="input-field pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(locale, "sidebar.club_placeholder")}
            autoFocus
          />
        </div>
        <button className="btn-primary" type="submit" disabled={loading || !query.trim()}>
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t(locale, "sidebar.searching")}
            </>
          ) : (
            t(locale, "sidebar.search_button")
          )}
        </button>
      </form>

      <p className="mx-auto mb-10 max-w-2xl text-center text-xs text-[var(--pc-faint)]">
        {t(locale, "home.search_hint", { name: DEFAULT_CLUB_NAME })}
      </p>

      {error && (
        <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-[rgba(255,90,106,0.3)] bg-[var(--pc-loss-soft)] px-4 py-3 text-sm text-[var(--pc-loss)]">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mx-auto max-w-2xl">
          <p className="pc-section-label mb-3">
            {t(locale, "home.results_label", { count: results.length })}
          </p>
          <div className="stagger grid gap-3">
            {results.map((club) => (
              <ClubResultCard key={club.club_id} club={club} locale={locale} />
            ))}
          </div>
        </div>
      )}

      {searched && !results.length && !loading && !error && (
        <p className="mx-auto max-w-2xl text-center text-sm text-[var(--pc-muted)]">
          {t(locale, "home.no_results")}
        </p>
      )}

      {/* Recent + features (only before a search) */}
      {!searched && !loading && (
        <div className="mx-auto max-w-4xl">
          {recent.length > 0 && (
            <div className="mb-12">
              <p className="pc-section-label mb-3 flex items-center gap-1.5">
                <History size={12} />
                {t(locale, "home.recent_label")}
              </p>
              <div className="flex flex-wrap gap-2">
                {recent.map((club) => (
                  <Link
                    key={club.club_id}
                    href={`/clubs/${club.club_id}`}
                    className="chip transition hover:border-[var(--pc-accent-border)] hover:text-[var(--pc-text)]"
                  >
                    <strong>{club.name}</strong>
                    {club.division ? <span>· Div {club.division}</span> : null}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="stagger grid gap-4 md:grid-cols-3">
            {features.map(([Icon, title, desc]) => (
              <div key={title} className="pc-card pc-card-hover">
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-[var(--pc-accent-border)] bg-[var(--pc-accent-soft)] text-[var(--pc-accent)]">
                  <Icon size={18} />
                </span>
                <div className="font-[family-name:var(--font-display)] font-semibold">
                  {t(locale, title)}
                </div>
                <div className="mt-1.5 text-sm leading-relaxed text-[var(--pc-muted)]">
                  {t(locale, desc)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
