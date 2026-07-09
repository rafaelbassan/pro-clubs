"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MatchRecord } from "@/lib/api";
import { Locale, matchTypeLabel, resultLabel, t } from "@/lib/i18n";

const RESULT_COLORS: Record<string, string> = {
  V: "#00e676",
  D: "#ff5a6a",
  E: "#ffb020",
};

const AXIS_TICK = { fill: "#7b8d81", fontSize: 11 };
const GRID_STROKE = "rgba(255,255,255,0.05)";
const TOOLTIP_STYLE = {
  background: "#0d1418",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};
const LEGEND_STYLE = { fontSize: 12, color: "#b8c6bd" };

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pc-card flex h-[380px] flex-col">
      <h3 className="mb-3 text-[15px] font-semibold">{title}</h3>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function formatShortDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
    day: "2-digit",
    month: "2-digit",
  });
}

type FormPoint = {
  axisKey: string;
  axisLabel: string;
  opponent: string;
  scored: number;
  conceded: number;
  form: number;
  isZeroDraw: boolean;
};

function FormTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: FormPoint }>;
  locale: Locale;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as FormPoint | undefined;
  if (!row) return null;

  const conceded = Math.abs(row.conceded);
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <p className="mb-1 font-semibold text-[var(--pc-text)]">
        {row.axisLabel} · vs {row.opponent}
      </p>
      <p className="mono text-sm text-[var(--pc-text-secondary)]">
        {row.scored} – {conceded}
        {row.isZeroDraw && (
          <span className="ml-2 text-[var(--pc-draw)]">({t(locale, "charts.zero_draw")})</span>
        )}
      </p>
      <p className="mt-1 text-xs text-[var(--pc-muted)]">
        {t(locale, "charts.form_line")}:{" "}
        <span className="font-semibold text-[var(--pc-draw)]">{row.form}</span>
      </p>
    </div>
  );
}

export function FormChart({ matches, locale }: { matches: MatchRecord[]; locale: Locale }) {
  if (!matches.length) {
    return (
      <ChartCard title={t(locale, "charts.form_title")}>
        <p className="text-sm text-[var(--pc-muted)]">{t(locale, "charts.no_form")}</p>
      </ChartCard>
    );
  }

  const sorted = [...matches].sort(
    (a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime(),
  );
  const data: FormPoint[] = sorted.map((m, i) => {
    const window = sorted.slice(0, i + 1).slice(-5);
    const rolling =
      window.reduce((sum, x) => sum + (x.result === "V" ? 3 : x.result === "E" ? 1 : 0), 0) /
      window.length;
    const date = formatShortDate(m.date, locale);
    const isZeroDraw = m.club_goals === 0 && m.opponent_goals === 0;
    return {
      axisKey: m.match_id || String(i),
      axisLabel: `${date} · ${m.opponent_name.slice(0, 8)}`,
      opponent: m.opponent_name,
      scored: m.club_goals,
      conceded: -m.opponent_goals,
      form: Number(rolling.toFixed(2)),
      isZeroDraw,
    };
  });

  const maxGoals = Math.max(
    3,
    ...data.map((d) => Math.max(d.scored, Math.abs(d.conceded))),
  );

  const axisLabels = Object.fromEntries(data.map((d) => [d.axisKey, d.axisLabel]));

  return (
    <ChartCard title={t(locale, "charts.form_title")}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 8, left: -18 }}
          stackOffset="sign"
        >
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="axisKey"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={data.length > 6 ? -32 : 0}
            textAnchor={data.length > 6 ? "end" : "middle"}
            height={data.length > 6 ? 52 : 30}
            tickFormatter={(key) => axisLabels[key]?.split(" · ")[0] ?? key}
          />
          <YAxis
            yAxisId="left"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            domain={[-maxGoals, maxGoals]}
            tickFormatter={(v) => String(Math.abs(v))}
          />
          <YAxis yAxisId="right" orientation="right" domain={[0, 3]} hide />
          <Tooltip
            shared
            content={(props) => <FormTooltip {...props} locale={locale} />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
          <Bar
            yAxisId="left"
            dataKey="scored"
            name={t(locale, "charts.goals_scored")}
            fill="#00e676"
            stackId="match"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            yAxisId="left"
            dataKey="conceded"
            name={t(locale, "charts.goals_conceded")}
            fill="#ff5a6a"
            fillOpacity={0.85}
            stackId="match"
            radius={[0, 0, 4, 4]}
            maxBarSize={28}
          />
          {data
            .filter((d) => d.isZeroDraw)
            .map((d) => (
              <ReferenceDot
                key={d.axisKey}
                x={d.axisKey}
                y={0}
                yAxisId="left"
                r={7}
                fill={RESULT_COLORS.E}
                stroke="#05080a"
                strokeWidth={2}
                ifOverflow="visible"
              />
            ))}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="form"
            name={t(locale, "charts.form_line")}
            stroke="#ffb020"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ResultsPie({ matches, locale }: { matches: MatchRecord[]; locale: Locale }) {
  if (!matches.length) return null;
  const counts = matches.reduce<Record<string, number>>((acc, m) => {
    acc[m.result] = (acc[m.result] || 0) + 1;
    return acc;
  }, {});
  const data = ["V", "E", "D"]
    .filter((r) => counts[r])
    .map((result) => ({
      name: resultLabel(locale, result),
      result,
      value: counts[result],
    }));
  const total = matches.length;
  const winPct = Math.round(((counts.V || 0) / total) * 100);

  return (
    <ChartCard title={t(locale, "charts.results_title")}>
      <div className="relative h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={3}
              cornerRadius={6}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.result} fill={RESULT_COLORS[entry.result] || "#888"} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
          <span className="tabular-nums font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--pc-win)]">
            {winPct}%
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--pc-muted)]">
            {t(locale, "metrics.win_rate")}
          </span>
        </div>
      </div>
    </ChartCard>
  );
}

export function MatchTypeChart({ matches, locale }: { matches: MatchRecord[]; locale: Locale }) {
  if (!matches.length) return null;
  const grouped: Record<string, Record<string, number>> = {};
  matches.forEach((m) => {
    const tipo = matchTypeLabel(locale, m.match_type, true);
    grouped[tipo] = grouped[tipo] || {};
    grouped[tipo][m.result] = (grouped[tipo][m.result] || 0) + 1;
  });
  const data = Object.entries(grouped).map(([tipo, results]) => ({
    tipo,
    V: results.V || 0,
    E: results.E || 0,
    D: results.D || 0,
  }));

  return (
    <ChartCard title={t(locale, "charts.match_type_title")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="tipo" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
          <Bar dataKey="V" stackId="a" fill={RESULT_COLORS.V} name={resultLabel(locale, "V")} maxBarSize={44} />
          <Bar dataKey="E" stackId="a" fill={RESULT_COLORS.E} name={resultLabel(locale, "E")} maxBarSize={44} />
          <Bar
            dataKey="D"
            stackId="a"
            fill={RESULT_COLORS.D}
            name={resultLabel(locale, "D")}
            maxBarSize={44}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
