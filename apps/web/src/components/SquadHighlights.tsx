import { Star, Target, Trophy } from "lucide-react";
import type { PlayerStats } from "@/lib/api";
import { Locale, t } from "@/lib/i18n";

const POS_LABELS: Record<string, Record<Locale, string>> = {
  forward: { pt: "ATA", en: "FWD" },
  midfielder: { pt: "MEI", en: "MID" },
  defender: { pt: "ZAG", en: "DEF" },
  goalkeeper: { pt: "GOL", en: "GK" },
};

function posBadge(locale: Locale, pos: string) {
  return POS_LABELS[pos.toLowerCase()]?.[locale] ?? pos.slice(0, 3).toUpperCase();
}

function HighlightCard({
  icon: Icon,
  label,
  player,
  stat,
  locale,
  tone = "accent",
}: {
  icon: typeof Trophy;
  label: string;
  player: PlayerStats;
  stat: string;
  locale: Locale;
  tone?: "accent" | "win" | "draw";
}) {
  const toneClass =
    tone === "win"
      ? "text-[var(--pc-win)]"
      : tone === "draw"
        ? "text-[var(--pc-draw)]"
        : "text-[var(--pc-accent)]";

  return (
    <div className="pc-card pc-card-hover flex items-center gap-3 !p-4">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--pc-accent-border)] bg-[var(--pc-accent-soft)] ${toneClass}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--pc-faint)]">
          {label}
        </p>
        <p className="truncate font-[family-name:var(--font-display)] font-bold">{player.name}</p>
        <p className="mt-0.5 text-xs text-[var(--pc-muted)]">
          <span className={`font-semibold ${toneClass}`}>{stat}</span>
          {player.pos && (
            <span className="ml-2 rounded bg-[var(--pc-surface)] px-1.5 py-0.5 text-[10px] font-semibold">
              {posBadge(locale, player.pos)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export function SquadHighlights({ squad, locale }: { squad: PlayerStats[]; locale: Locale }) {
  const topScorer = [...squad].sort((a, b) => b.goals - a.goals || b.avg_rating - a.avg_rating)[0];
  const bestRated = [...squad]
    .filter((p) => p.appearances >= 2)
    .sort((a, b) => b.avg_rating - a.avg_rating || b.goals - a.goals)[0];
  const momKing = [...squad].sort((a, b) => b.mom - a.mom || b.avg_rating - a.avg_rating)[0];

  const cards = [
    topScorer?.goals > 0 && {
      icon: Trophy,
      label: t(locale, "squad.top_scorer"),
      player: topScorer,
      stat: `${topScorer.goals} ${t(locale, "squad.goals").toLowerCase()}`,
      tone: "win" as const,
    },
    bestRated && {
      icon: Star,
      label: t(locale, "squad.best_rating"),
      player: bestRated,
      stat: bestRated.avg_rating.toFixed(2),
      tone: "draw" as const,
    },
    momKing?.mom > 0 && {
      icon: Target,
      label: t(locale, "squad.mom_king"),
      player: momKing,
      stat: `${momKing.mom} MOM`,
      tone: "accent" as const,
    },
  ].filter(Boolean) as {
    icon: typeof Trophy;
    label: string;
    player: PlayerStats;
    stat: string;
    tone: "accent" | "win" | "draw";
  }[];

  if (!cards.length) return null;

  return (
    <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <HighlightCard key={card.label} {...card} locale={locale} />
      ))}
    </div>
  );
}
