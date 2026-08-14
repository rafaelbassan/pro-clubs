"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, Calendar, ClipboardList, Lock, Settings, Trophy, Users } from "lucide-react";
import type { ClubAnalytics, ClubResponse } from "@/lib/api";
import { getClubAnalytics } from "@/lib/api";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";
import { PeriodFilterProvider, usePeriodFilter } from "@/components/club/PeriodFilter";
import { PeriodFilterBar } from "@/components/club/PeriodFilterBar";
import { DesempenhoPanel } from "@/components/club/DesempenhoPanel";
import { ElencoPanel } from "@/components/club/ElencoPanel";
import { EventosPanel } from "@/components/club/EventosPanel";
import { MatchManagePanel } from "@/components/club/MatchManagePanel";
import { ClubSettingsModal } from "@/components/club/ClubSettingsModal";
import { CameraFab } from "@/components/club/CameraFab";
import { ShareStatsButton } from "@/components/club/ShareStatsButton";

type MainTab = "desempenho" | "elenco" | "eventos" | "partidas";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function ClubShellInner({
  data,
  onRefresh,
}: {
  data: ClubResponse;
  onRefresh: () => void;
}) {
  const { locale } = useLocale();
  const { filter } = usePeriodFilter();
  const [tab, setTab] = useState<MainTab>("desempenho");
  const [analytics, setAnalytics] = useState<ClubAnalytics | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const isAdmin = data.meta.role === "owner" || data.meta.role === "admin";
  const summary = data.summary;

  useEffect(() => {
    setLoadingAnalytics(true);
    getClubAnalytics(data.club_id, filter)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoadingAnalytics(false));
  }, [data.club_id, filter]);

  const tabs: { id: MainTab; label: string; icon: ReactNode }[] = [
    { id: "desempenho", label: t(locale, "tabs.performance"), icon: <BarChart3 size={18} /> },
    { id: "elenco", label: t(locale, "tabs.squad"), icon: <Users size={18} /> },
    { id: "eventos", label: t(locale, "tabs.events"), icon: <Calendar size={18} /> },
    { id: "partidas", label: t(locale, "tabs.matches"), icon: <ClipboardList size={18} /> },
  ];

  return (
    <div className="animate-rise pc-fab-safe">
      <div className="pc-card mb-4 border-[var(--pc-accent-border)] shadow-[0_0_40px_rgba(0,230,118,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {summary.crest_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={summary.crest_url}
                alt=""
                className="h-14 w-14 rounded-xl border border-[var(--pc-accent-border)] object-cover"
              />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[var(--pc-accent-border)] bg-gradient-to-br from-[var(--pc-accent-soft)] to-transparent font-[family-name:var(--font-display)] text-lg font-bold text-[var(--pc-accent)]">
                {initials(summary.name) || "?"}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold md:text-2xl">{summary.name}</h1>
              <p className="mt-0.5 text-xs text-[var(--pc-muted)]">
                {analytics?.matches ?? summary.games_played} {t(locale, "club.matches_label")}
                {" · "}
                {data.meta.total_matches} {t(locale, "club.total_label")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                  {[...data.matches]
                    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                    .slice(0, 5)
                    .map((m) => (
                      <span
                        key={m.match_id}
                        className={`form-dot form-dot-${m.result.toLowerCase()}`}
                        title={m.score}
                      >
                        {m.result}
                      </span>
                    ))}
                </div>
                <span className="chip bg-[var(--pc-draw-soft)] text-[var(--pc-draw)]">
                  <Trophy size={12} />
                  {summary.trophy_count ?? 0} {t(locale, "club.trophies")}
                </span>
                {isAdmin && (
                  <span className="chip border-[rgba(91,77,184,0.28)] bg-[var(--pc-admin-soft)] text-[var(--pc-admin)]">
                    <Lock size={12} />
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ShareStatsButton summary={summary} analytics={analytics} compact />
            <button
              type="button"
              className="btn-ghost !p-2"
              onClick={() => setSettingsOpen(true)}
              title={t(locale, "settings.title")}
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`pc-nav-tile ${tab === item.id ? "pc-nav-tile-active" : ""}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {(tab === "desempenho" || tab === "elenco") && <PeriodFilterBar />}

      {tab === "desempenho" && (
        <DesempenhoPanel
          analytics={analytics}
          loading={loadingAnalytics}
          clubMatches={data.matches}
          summary={summary}
        />
      )}
      {tab === "elenco" && (
        <ElencoPanel
          analytics={analytics}
          loading={loadingAnalytics}
          clubId={data.club_id}
          isAdmin={isAdmin}
          onRefresh={onRefresh}
        />
      )}
      {tab === "eventos" && (
        <EventosPanel
          clubId={data.club_id}
          clubName={summary.name}
          isAdmin={isAdmin}
        />
      )}
      {tab === "partidas" && (
        <MatchManagePanel
          clubId={data.club_id}
          data={data}
          isAdmin={isAdmin}
          onRefresh={onRefresh}
        />
      )}

      {isAdmin && (
        <CameraFab clubId={data.club_id} onUploaded={onRefresh} />
      )}

      {settingsOpen && (
        <ClubSettingsModal
          clubId={data.club_id}
          onClose={() => setSettingsOpen(false)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

export function ClubShell({
  data,
  onRefresh,
}: {
  data: ClubResponse;
  onRefresh: () => void;
}) {
  return (
    <PeriodFilterProvider>
      <ClubShellInner data={data} onRefresh={onRefresh} />
    </PeriodFilterProvider>
  );
}
