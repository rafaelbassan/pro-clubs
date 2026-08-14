"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { PeriodFilter } from "@/lib/api";

export type PeriodPreset = "all" | "last5" | "last10" | "custom";

type PeriodContextValue = {
  preset: PeriodPreset;
  setPreset: (p: PeriodPreset) => void;
  dateFrom: string;
  dateTo: string;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  filter: PeriodFilter;
};

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodFilterProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filter = useMemo<PeriodFilter>(() => {
    if (preset === "last5") return { last_n: 5 };
    if (preset === "last10") return { last_n: 10 };
    if (preset === "custom") {
      return {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };
    }
    return {};
  }, [preset, dateFrom, dateTo]);

  return (
    <PeriodContext.Provider
      value={{
        preset,
        setPreset,
        dateFrom,
        dateTo,
        setDateFrom,
        setDateTo,
        filter,
      }}
    >
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriodFilter() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriodFilter must be used within PeriodFilterProvider");
  return ctx;
}
