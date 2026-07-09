"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { getClubHistory, syncClub, trackClub, type ClubResponse } from "@/lib/api";
import { ClubDashboard } from "@/components/ClubDashboard";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

export default function ClubHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();
  const { locale } = useLocale();
  const [data, setData] = useState<ClubResponse | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/clubs/${id}/history`);
      return;
    }
    if (status === "authenticated" && session?.apiToken) {
      getClubHistory(id, session.apiToken)
        .then(setData)
        .catch((err) => setError(err.message));
    }
  }, [status, session, id, router]);

  async function handleSync() {
    if (!session?.apiToken) return;
    setSyncing(true);
    setError("");
    try {
      await syncClub(id, session.apiToken);
      await trackClub(id, session.apiToken);
      const refreshed = await getClubHistory(id, session.apiToken);
      setData(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "history.sync_failed"));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/clubs/${id}`}
          className="flex items-center gap-1.5 text-sm text-[var(--pc-muted)] transition hover:text-[var(--pc-text)]"
        >
          <ArrowLeft size={15} />
          {t(locale, "nav.today")}
        </Link>
        <button className="btn-primary !py-1.5 text-xs" onClick={handleSync} disabled={syncing || !data}>
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {syncing ? t(locale, "history.syncing") : t(locale, "history.sync")}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-[rgba(255,90,106,0.3)] bg-[var(--pc-loss-soft)] px-4 py-3 text-sm text-[var(--pc-loss)]">
          {error}
        </div>
      )}

      {status === "loading" || (!data && !error) ? (
        <DashboardSkeleton />
      ) : data ? (
        <ClubDashboard data={data} locale={locale} historyMode />
      ) : null}
    </div>
  );
}
