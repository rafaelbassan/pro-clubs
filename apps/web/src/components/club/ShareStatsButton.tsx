"use client";

import { useRef } from "react";
import { Share2 } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";
import type { ClubAnalytics, ClubSummary } from "@/lib/api";

/** Share club overview as text (WhatsApp / native share) or download a simple image card. */
export function ShareStatsButton({
  summary,
  analytics,
  compact = false,
}: {
  summary: ClubSummary;
  analytics: ClubAnalytics | null;
  compact?: boolean;
}) {
  const { locale } = useLocale();
  const cardRef = useRef<HTMLDivElement>(null);

  const text = () => {
    if (!analytics) return summary.name;
    return [
      `*${summary.name}*`,
      `${analytics.wins}V ${analytics.draws}E ${analytics.losses}D · ${analytics.win_rate}% WR`,
      `Gols ${analytics.goals_for}:${analytics.goals_against} (${analytics.goal_diff >= 0 ? "+" : ""}${analytics.goal_diff})`,
      `${analytics.matches} partidas · CS ${analytics.clean_sheets}`,
    ].join("\n");
  };

  const share = async () => {
    const payload = text();
    if (navigator.share) {
      try {
        await navigator.share({ title: summary.name, text: payload });
        return;
      } catch {
        // fall through
      }
    }
    await navigator.clipboard.writeText(payload);

    // Best-effort PNG of a hidden card for stories
    if (cardRef.current && "html2canvas" in window === false) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 720;
        canvas.height = 420;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#f3f5f2";
          ctx.fillRect(0, 0, 720, 420);
          ctx.fillStyle = "#157a45";
          ctx.font = "bold 36px sans-serif";
          ctx.fillText(summary.name, 40, 80);
          ctx.fillStyle = "#14241a";
          ctx.font = "24px monospace";
          if (analytics) {
            ctx.fillText(`${analytics.win_rate}% WR`, 40, 140);
            ctx.fillText(`${analytics.wins}-${analytics.draws}-${analytics.losses}`, 40, 190);
            ctx.fillText(`${analytics.goals_for}:${analytics.goals_against}`, 40, 240);
          }
          const a = document.createElement("a");
          a.download = `${summary.name.replace(/\s+/g, "_")}_stats.png`;
          a.href = canvas.toDataURL("image/png");
          a.click();
        }
      } catch {
        // ignore
      }
    }
  };

  return (
    <button type="button" className="btn-ghost !p-2" onClick={share} title={t(locale, "common.share")}>
      <Share2 size={16} />
      {!compact && <span className="text-xs">{t(locale, "common.share")}</span>}
      <div ref={cardRef} className="hidden" />
    </button>
  );
}
