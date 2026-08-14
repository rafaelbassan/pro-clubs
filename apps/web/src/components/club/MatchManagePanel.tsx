"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, FileText, XCircle } from "lucide-react";
import {
  generateReport,
  listManageMatches,
  type ClubResponse,
  type MatchRecord,
} from "@/lib/api";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

function statusOf(match: MatchRecord) {
  return (match.status || "approved").toLowerCase();
}

export function MatchManagePanel({
  clubId,
  data,
  isAdmin,
  onRefresh,
}: {
  clubId: string;
  data: ClubResponse;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const { locale } = useLocale();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [managed, setManaged] = useState<MatchRecord[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const source = managed ?? data.matches;
  const counts = useMemo(() => {
    const pending = data.meta.pending_matches ?? source.filter((m) => statusOf(m) === "pending").length;
    const approved = data.meta.approved_matches ?? source.filter((m) => statusOf(m) === "approved").length;
    const rejected = data.meta.rejected_matches ?? source.filter((m) => statusOf(m) === "rejected").length;
    return { pending, approved, rejected, total: data.meta.total_matches };
  }, [data.meta, source]);

  const visible = source.filter((m) => filter === "all" || statusOf(m) === filter);

  async function loadManaged(status?: string) {
    const rows = await listManageMatches(clubId, undefined, status !== "all" ? status : undefined);
    setManaged(rows);
  }

  async function onReport() {
    setBusy(true);
    setMessage("");
    try {
      await generateReport(clubId);
      setMessage(t(locale, "matches.report_ready"));
      onRefresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t(locale, "common.error"));
    } finally {
      setBusy(false);
    }
  }

  const pills: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: t(locale, "matches.filter_all"), count: counts.total },
    { id: "pending", label: t(locale, "matches.filter_pending"), count: counts.pending },
    { id: "approved", label: t(locale, "matches.filter_approved"), count: counts.approved },
    { id: "rejected", label: t(locale, "matches.filter_rejected"), count: counts.rejected },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="pc-card text-center !p-3">
          <CircleDashed size={16} className="mx-auto text-[var(--pc-admin)]" />
          <div className="mono mt-1 text-xl font-bold text-[var(--pc-admin)]">{counts.pending}</div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--pc-muted)]">
            {t(locale, "matches.pending")}
          </div>
        </div>
        <div className="pc-card text-center !p-3">
          <CheckCircle2 size={16} className="mx-auto text-[var(--pc-win)]" />
          <div className="mono mt-1 text-xl font-bold text-[var(--pc-win)]">{counts.approved}</div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--pc-muted)]">
            {t(locale, "matches.approved")}
          </div>
        </div>
        <div className="pc-card text-center !p-3">
          <XCircle size={16} className="mx-auto text-[var(--pc-loss)]" />
          <div className="mono mt-1 text-xl font-bold text-[var(--pc-loss)]">{counts.rejected}</div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--pc-muted)]">
            {t(locale, "matches.rejected")}
          </div>
        </div>
      </div>

      <div className="pc-tablist">
        {pills.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`pc-tab ${filter === p.id ? "pc-tab-active" : ""}`}
            onClick={() => {
              setFilter(p.id);
              loadManaged(p.id).catch(() => undefined);
            }}
          >
            {p.label} ({p.count})
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="pc-card text-sm text-[var(--pc-muted)]">{t(locale, "table.empty")}</div>
      )}

      <div className="space-y-2">
        {visible.map((m) => (
          <div
            key={m.match_id}
            className="pc-card flex items-center justify-between gap-3 !py-3"
            style={{
              borderLeft: `3px solid ${
                m.result === "V" ? "var(--pc-win)" : m.result === "D" ? "var(--pc-loss)" : "var(--pc-draw)"
              }`,
            }}
          >
            <div className="min-w-0">
              <div className="truncate font-semibold">
                {m.club_name} vs {m.opponent_name}
              </div>
              <div className="mt-0.5 text-xs text-[var(--pc-muted)]">
                {m.date ? new Date(m.date).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US") : "—"}
                {" · "}
                {t(locale, `matches.status_${statusOf(m)}`)}
              </div>
            </div>
            <div className="mono shrink-0 text-lg font-bold">{m.score}</div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <button className="btn-primary w-full" type="button" disabled={busy} onClick={onReport}>
          <FileText size={15} />
          {t(locale, "matches.generate_report")} ({counts.approved})
        </button>
      )}
      {message && <p className="text-center text-sm text-[var(--pc-muted)]">{message}</p>}
    </div>
  );
}
