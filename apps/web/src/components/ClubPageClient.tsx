"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getClubMatches, type ClubResponse } from "@/lib/api";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { pushRecentClub } from "@/lib/recentClubs";
import { ClubShell } from "@/components/club/ClubShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

export function ClubPageClient({ id }: { id: string }) {
  const { locale } = useLocale();
  const [data, setData] = useState<ClubResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    return getClubMatches(id)
      .then((res) => {
        setData(res);
        if (res.summary?.name) {
          pushRecentClub({
            club_id: id,
            name: res.summary.name,
            division: res.summary.current_division,
          });
        }
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    setError("");
    load();
  }, [load]);

  if (error) {
    return (
      <div className="pc-card mx-auto max-w-xl border-[var(--pc-loss-soft)] text-center">
        <p className="font-medium text-[var(--pc-loss)]">{error}</p>
        <p className="mt-3 text-sm text-[var(--pc-muted)]">
          {t(locale, "errors.backend_hint")}
        </p>
        <code className="mt-2 inline-block rounded-lg bg-[var(--pc-surface-muted)] px-3 py-1.5 text-xs text-[var(--pc-text-secondary)]">
          docker compose -f infra/docker-compose.yml up postgres api -d
        </code>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-[var(--pc-muted)] transition hover:text-[var(--pc-text)]"
        >
          <ArrowLeft size={15} />
          {t(locale, "nav.back")}
        </Link>
        <Link href={`/clubs/${id}/history`} className="btn-ghost !py-1.5 text-xs">
          <RefreshCw size={14} />
          {t(locale, "history.sync")}
        </Link>
      </div>
      {data ? (
        <ClubShell data={data} onRefresh={() => load()} />
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  );
}
