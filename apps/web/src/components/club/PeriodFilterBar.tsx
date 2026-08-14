"use client";

import { usePeriodFilter, type PeriodPreset } from "@/components/club/PeriodFilter";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

const PRESETS: { id: PeriodPreset; key: string }[] = [
  { id: "all", key: "filters.all" },
  { id: "last5", key: "filters.last5" },
  { id: "last10", key: "filters.last10" },
];

export function PeriodFilterBar() {
  const { locale } = useLocale();
  const { preset, setPreset, dateFrom, dateTo, setDateFrom, setDateTo } = usePeriodFilter();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPreset(p.id)}
          className={`pc-tab ${preset === p.id ? "pc-tab-active" : ""}`}
        >
          {t(locale, p.key)}
        </button>
      ))}
      <div className="flex items-center gap-1.5 text-xs text-[var(--pc-muted)]">
        <span>{t(locale, "filters.from")}</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPreset("custom");
          }}
          className="input-field !w-auto !py-1 !text-xs"
        />
        <span>{t(locale, "filters.to")}</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPreset("custom");
          }}
          className="input-field !w-auto !py-1 !text-xs"
        />
      </div>
    </div>
  );
}
