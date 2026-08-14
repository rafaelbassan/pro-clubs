"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { getClubHistory, syncClub, type ClubResponse } from "@/lib/api";
import { ClubShell } from "@/components/club/ClubShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

export default function ClubHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { locale } = useLocale();
  const [data, setData] = useState<ClubResponse | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    return getClubHistory(id)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    setError("");
    reload();
  }, [reload]);

  async function handleSync() {
    setSyncing(true);
    setError("");
    try {
      await syncClub(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "history.sync_failed"));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg md:max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/clubs/${id}`}
          className="flex items-center gap-1.5 text-sm text-[var(--pc-muted)] transition hover:text-[var(--pc-text)]"
        >
          <ArrowLeft size={15} />
          {t(locale, "nav.today")}
        </Link>
        <button className="btn-primary !py-1.5 text-xs" onClick={handleSync} disabled={syncing}>
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {syncing ? t(locale, "history.syncing") : t(locale, "history.sync")}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-[rgba(255,90,106,0.3)] bg-[var(--pc-loss-soft)] px-4 py-3 text-sm text-[var(--pc-loss)]">
          {error}
        </div>
      )}

      {!data && !error ? (
        <DashboardSkeleton />
      ) : data ? (
        <ClubShell data={data} onRefresh={() => reload()} />
      ) : null}
    </div>
  );
}
