"use client";

import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { ClubAnalytics, PlayerStats } from "@/lib/api";
import { updateClubPlayer } from "@/lib/api";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

type SubTab = "jogadores" | "comparar" | "rankings" | "time_ideal" | "gestao";

const POSITIONS = ["GOL", "DEF", "ALA", "VOL", "MEI", "ATA", "forward", "midfielder", "defender", "goalkeeper"];

function ratingTone(rating: number) {
  if (rating >= 7.5) return "text-[var(--pc-win)] bg-[var(--pc-win-soft)]";
  if (rating >= 6.8) return "text-[var(--pc-draw)] bg-[var(--pc-draw-soft)]";
  return "text-[var(--pc-loss)] bg-[var(--pc-loss-soft)]";
}

function shortPos(pos: string) {
  const map: Record<string, string> = {
    goalkeeper: "GOL",
    defender: "DEF",
    midfielder: "MEI",
    forward: "ATA",
  };
  return map[pos] || pos.slice(0, 3).toUpperCase() || "—";
}

function PlayerRow({
  player,
  onClick,
}: {
  player: PlayerStats;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pc-card pc-card-hover flex w-full items-center gap-3 !p-3 text-left"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--pc-surface-muted)] text-[10px] font-bold text-[var(--pc-muted)]">
        {shortPos(player.pos)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{player.name}</div>
        <div className="mt-0.5 flex gap-3 text-[11px] text-[var(--pc-muted)]">
          <span>{player.goals} G</span>
          <span>{player.assists} A</span>
          <span>{player.appearances} J</span>
        </div>
      </div>
      <span className={`mono rounded-lg px-2.5 py-1 text-sm font-bold ${ratingTone(player.avg_rating)}`}>
        {player.avg_rating.toFixed(2)}
      </span>
    </button>
  );
}

function PlayerModal({ player, onClose }: { player: PlayerStats; onClose: () => void }) {
  const { locale } = useLocale();
  const radar = [
    { key: "GOLS", value: player.goals },
    { key: "ASSIST", value: player.assists },
    { key: "CHUTES", value: player.shots },
    { key: "PASSC", value: Math.min(player.passes_made / 10, 100) },
    { key: "DIVG", value: player.tackles_made },
    { key: "MOM", value: player.mom * 5 },
  ];
  const max = Math.max(...radar.map((r) => r.value), 1);
  const data = radar.map((r) => ({ ...r, value: Math.round((r.value / max) * 100) }));

  return (
    <div className="pc-modal-backdrop" onClick={onClose} role="presentation">
      <div className="pc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className={`mx-auto mb-2 inline-flex rounded-xl px-3 py-1 mono text-3xl font-extrabold ${ratingTone(player.avg_rating)}`}>
            {player.avg_rating.toFixed(2)}
          </div>
          <div className="mt-1 text-lg font-bold">{player.name}</div>
          <div className="mt-2 inline-block rounded-full bg-[var(--pc-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--pc-accent)]">
            {shortPos(player.pos)} · {player.appearances} {t(locale, "squad.apps")}
          </div>
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid stroke="rgba(20,36,26,0.12)" />
              <PolarAngleAxis dataKey="key" tick={{ fill: "#5c7266", fontSize: 10 }} />
              <Radar dataKey="value" stroke="#157a45" fill="#157a45" fillOpacity={0.22} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            [player.goals, "Gols"],
            [player.assists, "Assist."],
            [player.shots, "Chutes"],
            [player.passes_made, "Pass C."],
            [`${player.pass_accuracy}%`, "Pass%"],
            [player.tackles_made, "Div G."],
            [`${player.tackle_accuracy ?? 0}%`, "Div %"],
            [player.mom, "MOM"],
            [player.saves, "Defesas"],
          ].map(([v, l]) => (
            <div key={String(l)} className="rounded-xl bg-[var(--pc-surface-muted)] p-2 text-center">
              <div className="mono text-sm font-bold">{v}</div>
              <div className="text-[9px] uppercase text-[var(--pc-muted)]">{l}</div>
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-4 w-full" onClick={onClose}>
          {t(locale, "common.close")}
        </button>
      </div>
    </div>
  );
}

function CompareView({ squad }: { squad: PlayerStats[] }) {
  const { locale } = useLocale();
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const pa = squad.find((p) => p.player_id === a);
  const pb = squad.find((p) => p.player_id === b);

  const toggle = (id: string) => {
    if (a === id) setA(null);
    else if (b === id) setB(null);
    else if (!a) setA(id);
    else if (!b) setB(id);
    else {
      setA(b);
      setB(id);
    }
  };

  const metrics = pa && pb
    ? [
        ["Gols", pa.goals, pb.goals],
        ["Assist.", pa.assists, pb.assists],
        ["Chutes", pa.shots, pb.shots],
        ["Passes Comp.", pa.passes_made, pb.passes_made],
        ["% Passes", pa.pass_accuracy, pb.pass_accuracy],
        ["Divid. Ganhas", pa.tackles_made, pb.tackles_made],
        ["% Divididas", pa.tackle_accuracy ?? 0, pb.tackle_accuracy ?? 0],
      ] as const
    : [];

  return (
    <div>
      <p className="mb-3 text-center text-xs text-[var(--pc-muted)]">
        {t(locale, "elenco.select_compare")}
      </p>
      <div className="mb-4 space-y-2">
        {squad.map((p) => {
          const selected = p.player_id === a || p.player_id === b;
          return (
            <button
              key={p.player_id}
              type="button"
              onClick={() => toggle(p.player_id)}
              className={`pc-card flex w-full items-center justify-between !py-3 text-left ${
                selected ? "border-[var(--pc-accent)] bg-[var(--pc-accent-soft)]" : ""
              }`}
            >
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-[var(--pc-muted)]">
                  {shortPos(p.pos)} · {p.appearances}j
                </div>
              </div>
              <div className={`mono rounded-lg px-2 py-0.5 text-lg font-bold ${ratingTone(p.avg_rating)}`}>
                {p.avg_rating.toFixed(2)}
              </div>
            </button>
          );
        })}
      </div>
      {pa && pb && (
        <div className="pc-card">
          <div className="mb-4 flex items-center justify-between text-center">
            <div className="min-w-0 flex-1">
              <div className="text-2xl font-bold text-[var(--pc-accent)]">{pa.avg_rating.toFixed(2)}</div>
              <div className="truncate text-xs font-semibold">{pa.name}</div>
            </div>
            <div className="px-3 text-xs font-bold text-[var(--pc-faint)]">VS</div>
            <div className="min-w-0 flex-1">
              <div className="text-2xl font-bold text-[var(--pc-admin)]">{pb.avg_rating.toFixed(2)}</div>
              <div className="truncate text-xs font-semibold">{pb.name}</div>
            </div>
          </div>
          <div className="space-y-3">
            {metrics.map(([label, left, right]) => {
              const max = Math.max(Number(left), Number(right), 1);
              return (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="mono text-[var(--pc-accent)]">{left}</span>
                    <span className="text-[var(--pc-muted)]">{label}</span>
                    <span className="mono text-[var(--pc-admin)]">{right}</span>
                  </div>
                  <div className="flex h-2 gap-1">
                    <div className="flex flex-1 justify-end rounded bg-[var(--pc-surface-muted)]">
                      <div
                        className="h-full rounded bg-[var(--pc-accent)]"
                        style={{ width: `${(Number(left) / max) * 100}%` }}
                      />
                    </div>
                    <div className="flex flex-1 rounded bg-[var(--pc-surface-muted)]">
                      <div
                        className="h-full rounded bg-[var(--pc-admin)]"
                        style={{ width: `${(Number(right) / max) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RankingsView({ squad }: { squad: PlayerStats[] }) {
  const sections: { title: string; rows: { name: string; value: string }[] }[] = [
    {
      title: "NOTA MÉDIA",
      rows: [...squad]
        .sort((a, b) => b.avg_rating - a.avg_rating)
        .slice(0, 5)
        .map((p) => ({ name: p.name, value: p.avg_rating.toFixed(2) })),
    },
    {
      title: "GOLS",
      rows: [...squad]
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 5)
        .map((p) => ({ name: p.name, value: String(p.goals) })),
    },
    {
      title: "ASSISTÊNCIAS",
      rows: [...squad]
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 5)
        .map((p) => ({ name: p.name, value: String(p.assists) })),
    },
    {
      title: "FINALIZAÇÕES",
      rows: [...squad]
        .sort((a, b) => b.shots - a.shots)
        .slice(0, 5)
        .map((p) => ({ name: p.name, value: String(p.shots) })),
    },
    {
      title: "% PASSES",
      rows: [...squad]
        .filter((p) => p.pass_attempts > 0)
        .sort((a, b) => b.pass_accuracy - a.pass_accuracy)
        .slice(0, 5)
        .map((p) => ({
          name: p.name,
          value: `${p.passes_made}/${p.pass_attempts} (${p.pass_accuracy}%)`,
        })),
    },
    {
      title: "% DIVIDIDAS",
      rows: [...squad]
        .filter((p) => (p.tackle_attempts || 0) > 0)
        .sort((a, b) => (b.tackle_accuracy || 0) - (a.tackle_accuracy || 0))
        .slice(0, 5)
        .map((p) => ({
          name: p.name,
          value: `${p.tackles_made}/${p.tackle_attempts} (${p.tackle_accuracy}%)`,
        })),
    },
    {
      title: "MOM",
      rows: [...squad]
        .sort((a, b) => b.mom - a.mom)
        .slice(0, 5)
        .map((p) => ({ name: p.name, value: String(p.mom) })),
    },
    {
      title: "DEFESAS",
      rows: [...squad]
        .sort((a, b) => b.saves - a.saves)
        .slice(0, 5)
        .map((p) => ({ name: p.name, value: String(p.saves) })),
    },
  ];

  const rankColor = (i: number) =>
    i === 0
      ? "text-[var(--pc-draw)]"
      : i === 1
        ? "text-[var(--pc-muted)]"
        : i === 2
          ? "text-[#a16207]"
          : "text-[var(--pc-faint)]";

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.title} className="pc-card !p-3">
          <h4 className="pc-section-label mb-2">{section.title}</h4>
          <div className="space-y-1.5">
            {section.rows.map((row, i) => (
              <div key={`${section.title}-${row.name}`} className="flex items-center gap-2 text-sm">
                <span className={`w-4 font-bold ${rankColor(i)}`}>{i + 1}</span>
                <span className="flex-1 truncate">{row.name}</span>
                <span className="mono text-xs font-semibold text-[var(--pc-text-secondary)]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function IdealXI({ squad }: { squad: PlayerStats[] }) {
  const { locale } = useLocale();
  const active = squad.filter((p) => p.is_active !== false);
  const pick = (preds: string[]) =>
    active
      .filter((p) => preds.some((x) => shortPos(p.pos).includes(x) || p.pos.toLowerCase().includes(x.toLowerCase())))
      .sort((a, b) => b.avg_rating - a.avg_rating)[0];

  const xi = [
    { slot: "GOL", player: pick(["GOL", "goalkeeper"]) },
    { slot: "DEF", player: pick(["DEF", "defender"]) },
    { slot: "DEF", player: active.filter((p) => shortPos(p.pos) === "DEF" || p.pos === "defender").sort((a, b) => b.avg_rating - a.avg_rating)[1] },
    { slot: "ALA", player: pick(["ALA"]) },
    { slot: "VOL", player: pick(["VOL"]) },
    { slot: "MEI", player: pick(["MEI", "midfielder"]) },
    { slot: "MEI", player: active.filter((p) => shortPos(p.pos) === "MEI" || p.pos === "midfielder").sort((a, b) => b.avg_rating - a.avg_rating)[1] },
    { slot: "ALA", player: active.filter((p) => shortPos(p.pos) === "ALA").sort((a, b) => b.avg_rating - a.avg_rating)[1] },
    { slot: "ATA", player: pick(["ATA", "forward"]) },
    { slot: "ATA", player: active.filter((p) => shortPos(p.pos) === "ATA" || p.pos === "forward").sort((a, b) => b.avg_rating - a.avg_rating)[1] },
    { slot: "MEI", player: active.filter((p) => shortPos(p.pos) === "MEI" || p.pos === "midfielder").sort((a, b) => b.avg_rating - a.avg_rating)[2] },
  ];

  return (
    <div className="pc-card space-y-2">
      <h3 className="pc-section-label">{t(locale, "elenco.ideal_xi")}</h3>
      {xi.map((row, idx) => (
        <div
          key={`${row.slot}-${idx}`}
          className="flex items-center justify-between rounded-lg bg-[var(--pc-surface-muted)] px-3 py-2"
        >
          <span className="w-10 text-xs font-bold text-[var(--pc-muted)]">{row.slot}</span>
          <span className="flex-1 font-semibold">{row.player?.name || "—"}</span>
          <span className="mono text-sm text-[var(--pc-text-secondary)]">
            {row.player ? row.player.avg_rating.toFixed(2) : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function GestaoView({
  squad,
  clubId,
  onRefresh,
}: {
  squad: PlayerStats[];
  clubId: string;
  isAdmin?: boolean;
  onRefresh: () => void;
}) {
  const { locale } = useLocale();
  const [busy, setBusy] = useState<string | null>(null);

  const save = async (player: PlayerStats, patch: { position_override?: string; is_active?: boolean }) => {
    setBusy(player.player_id);
    try {
      await updateClubPlayer(clubId, player.player_id, patch);
      onRefresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{t(locale, "elenco.manage_title")}</h3>
      <p className="mb-3 text-xs text-[var(--pc-muted)]">
        {t(locale, "elenco.manage_subtitle", { count: squad.length })}
      </p>
      <div className="space-y-2">
        {squad.map((p) => (
          <div key={p.player_id} className="pc-card grid grid-cols-[1fr_auto_auto] items-center gap-2 !p-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{p.name}</div>
              <div className="text-[10px] text-[var(--pc-muted)]">
                {p.appearances}j · {p.avg_rating.toFixed(2)} nota
              </div>
            </div>
            <select
              className="input-field !w-20 !py-1 !text-xs"
              value={p.position_override || shortPos(p.pos)}
              disabled={busy === p.player_id}
              onChange={(e) => save(p, { position_override: e.target.value })}
            >
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {shortPos(pos)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy === p.player_id}
              onClick={() => save(p, { is_active: p.is_active === false })}
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                p.is_active === false
                  ? "bg-[var(--pc-loss-soft)] text-[var(--pc-loss)]"
                  : "bg-[var(--pc-win-soft)] text-[var(--pc-win)]"
              }`}
            >
              {p.is_active === false ? t(locale, "elenco.inactive") : t(locale, "elenco.active")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ElencoPanel({
  analytics,
  loading,
  clubId,
  isAdmin,
  onRefresh,
}: {
  analytics: ClubAnalytics | null;
  loading: boolean;
  clubId: string;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const { locale } = useLocale();
  const [sub, setSub] = useState<SubTab>("jogadores");
  const [selected, setSelected] = useState<PlayerStats | null>(null);

  const squad = useMemo(() => analytics?.squad ?? [], [analytics]);

  if (loading && !analytics) {
    return <div className="pc-card text-sm text-[var(--pc-muted)]">{t(locale, "common.loading")}</div>;
  }

  const tabs: { id: SubTab; key: string; admin?: boolean }[] = [
    { id: "jogadores", key: "elenco.players" },
    { id: "comparar", key: "elenco.compare" },
    { id: "rankings", key: "elenco.rankings" },
    { id: "time_ideal", key: "elenco.ideal" },
    { id: "gestao", key: "elenco.manage", admin: true },
  ];

  return (
    <div>
      <div className="pc-tablist mb-4">
        {tabs
          .filter((tab) => !tab.admin || isAdmin)
          .map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSub(tab.id)}
              className={`pc-tab ${sub === tab.id ? "pc-tab-active" : ""}`}
            >
              {t(locale, tab.key)}
            </button>
          ))}
      </div>

      {sub === "jogadores" && (
        <div className="space-y-2">
          {squad.length === 0 && (
            <div className="pc-card text-sm text-[var(--pc-muted)]">{t(locale, "squad.empty")}</div>
          )}
          {squad.map((p) => (
            <PlayerRow key={p.player_id} player={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      )}
      {sub === "comparar" && <CompareView squad={squad} />}
      {sub === "rankings" && <RankingsView squad={squad} />}
      {sub === "time_ideal" && <IdealXI squad={squad} />}
      {sub === "gestao" && (
        <GestaoView squad={squad} clubId={clubId} onRefresh={onRefresh} />
      )}

      {selected && <PlayerModal player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
