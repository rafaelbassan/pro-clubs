import type { PlayerStats } from "@/lib/api";
import { Locale, t } from "@/lib/i18n";

const POS_LABELS: Record<string, Record<Locale, string>> = {
  forward: { pt: "Atacante", en: "Forward" },
  midfielder: { pt: "Meio", en: "Midfielder" },
  defender: { pt: "Zagueiro", en: "Defender" },
  goalkeeper: { pt: "Goleiro", en: "Goalkeeper" },
};

const POS_BADGE: Record<string, string> = {
  forward: "bg-[rgba(0,230,118,0.12)] text-[var(--pc-win)]",
  midfielder: "bg-[rgba(0,140,255,0.12)] text-[#4db8ff]",
  defender: "bg-[rgba(255,176,32,0.12)] text-[var(--pc-draw)]",
  goalkeeper: "bg-[rgba(255,90,106,0.12)] text-[var(--pc-loss)]",
};

function posLabel(locale: Locale, pos: string) {
  return POS_LABELS[pos.toLowerCase()]?.[locale] ?? pos;
}

function posBadgeClass(pos: string) {
  return POS_BADGE[pos.toLowerCase()] ?? "bg-[var(--pc-surface)] text-[var(--pc-muted)]";
}

function ratingClass(rating: number) {
  if (rating >= 7.5) return "text-[var(--pc-win)]";
  if (rating >= 6.5) return "text-[var(--pc-draw)]";
  return "text-[var(--pc-loss)]";
}

function isGoalkeeper(pos: string) {
  return pos.toLowerCase() === "goalkeeper";
}

function positionBreakdownTitle(player: PlayerStats, locale: Locale) {
  const entries = Object.entries(player.positions ?? {});
  if (entries.length <= 1) return undefined;
  const total = entries.reduce((sum, [, time]) => sum + time, 0);
  if (!total) return undefined;
  return entries
    .map(([pos, time]) => {
      const pct = Math.round((time / total) * 100);
      return `${posLabel(locale, pos)} ${pct}%`;
    })
    .join(" · ");
}

function PositionCell({ player, locale }: { player: PlayerStats; locale: Locale }) {
  if (!player.pos) return <>—</>;

  const secondary = Object.keys(player.positions ?? {}).filter((pos) => pos !== player.pos);
  const title = positionBreakdownTitle(player, locale);

  return (
    <div className="flex flex-col gap-1" title={title}>
      <span
        className={`inline-block w-fit rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${posBadgeClass(player.pos)}`}
      >
        {posLabel(locale, player.pos)}
      </span>
      {secondary.length > 0 && (
        <span className="text-[10px] leading-tight text-[var(--pc-faint)]">
          {t(locale, "squad.also_played", {
            roles: secondary.map((pos) => posLabel(locale, pos)).join(", "),
          })}
        </span>
      )}
    </div>
  );
}

export function SquadTable({ squad, locale }: { squad: PlayerStats[]; locale: Locale }) {
  const sorted = [...squad].sort(
    (a, b) => b.appearances - a.appearances || b.goals - a.goals || b.avg_rating - a.avg_rating,
  );

  return (
    <div className="pc-card !p-0">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-[15px] font-semibold">{t(locale, "squad.table_title")}</h3>
        <span className="text-xs text-[var(--pc-faint)]">
          {sorted.length} {t(locale, "squad.count_suffix")}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--pc-border)] text-left text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--pc-faint)]">
              <th className="px-5 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">{t(locale, "squad.player")}</th>
              <th className="px-3 py-2.5 font-medium">{t(locale, "squad.pos")}</th>
              <th className="px-3 py-2.5 font-medium">{t(locale, "squad.apps")}</th>
              <th className="px-3 py-2.5 font-medium">{t(locale, "squad.goals")}</th>
              <th className="px-3 py-2.5 font-medium">{t(locale, "squad.assists")}</th>
              <th className="hidden px-3 py-2.5 font-medium sm:table-cell">{t(locale, "squad.shots")}</th>
              <th className="px-3 py-2.5 font-medium">{t(locale, "squad.rating")}</th>
              <th className="hidden px-3 py-2.5 font-medium md:table-cell">{t(locale, "squad.passes")}</th>
              <th className="hidden px-3 py-2.5 font-medium lg:table-cell">{t(locale, "squad.tackles")}</th>
              <th className="hidden px-3 py-2.5 font-medium lg:table-cell">{t(locale, "squad.saves")}</th>
              <th className="px-5 py-2.5 font-medium">{t(locale, "squad.mom")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr
                key={p.player_id}
                className="border-b border-[var(--pc-border)] transition last:border-b-0 hover:bg-[var(--pc-surface-hover)]"
              >
                <td className="tabular-nums px-5 py-3 text-[var(--pc-faint)]">{i + 1}</td>
                <td className="max-w-[160px] truncate px-3 py-3 font-medium">{p.name}</td>
                <td className="px-3 py-3">
                  <PositionCell player={p} locale={locale} />
                </td>
                <td className="tabular-nums px-3 py-3">{p.appearances}</td>
                <td className="tabular-nums px-3 py-3 font-semibold text-[var(--pc-accent)]">
                  {p.goals}
                </td>
                <td className="tabular-nums px-3 py-3">{p.assists}</td>
                <td className="tabular-nums hidden px-3 py-3 sm:table-cell">{p.shots}</td>
                <td className={`tabular-nums px-3 py-3 font-semibold ${ratingClass(p.avg_rating)}`}>
                  {p.avg_rating > 0 ? p.avg_rating.toFixed(2) : "—"}
                </td>
                <td className="tabular-nums hidden px-3 py-3 text-[var(--pc-muted)] md:table-cell">
                  {p.pass_attempts > 0
                    ? `${p.passes_made}/${p.pass_attempts} (${p.pass_accuracy}%)`
                    : "—"}
                </td>
                <td className="tabular-nums hidden px-3 py-3 lg:table-cell">
                  {isGoalkeeper(p.pos) ? "—" : p.tackles_made}
                </td>
                <td className="tabular-nums hidden px-3 py-3 font-semibold text-[var(--pc-draw)] lg:table-cell">
                  {isGoalkeeper(p.pos) && p.saves > 0 ? p.saves : p.saves > 0 ? p.saves : "—"}
                </td>
                <td className="tabular-nums px-5 py-3">
                  {p.mom > 0 ? (
                    <span className="font-semibold text-[var(--pc-draw)]">{p.mom}</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
