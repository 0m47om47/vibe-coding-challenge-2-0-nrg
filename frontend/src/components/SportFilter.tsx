"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { SportSelect } from "@/components/SportSelect";
import { SPORTS, type Sport } from "@/types";

const KEY = "academy-sport-filter";

interface SportFilterValue {
  /** The sport chosen in the top bar, or "" for every sport. Every coach and scout page follows it. */
  sport: Sport | "";
  setSport: (s: Sport | "") => void;
}

const SportFilterContext = createContext<SportFilterValue | null>(null);

export function SportFilterProvider({ children }: { children: React.ReactNode }) {
  const [sport, setSportState] = useState<Sport | "">("");

  // Remembered per browser. Read after mount so the first render matches the server.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && (SPORTS as readonly string[]).includes(saved)) setSportState(saved as Sport);
    } catch {
      /* storage can be blocked, the filter then simply starts on all sports */
    }
  }, []);

  const value = useMemo<SportFilterValue>(
    () => ({
      sport,
      setSport: (s) => {
        setSportState(s);
        try {
          localStorage.setItem(KEY, s);
        } catch {
          /* ignore */
        }
      },
    }),
    [sport]
  );

  return <SportFilterContext.Provider value={value}>{children}</SportFilterContext.Provider>;
}

export function useSportFilter() {
  const ctx = useContext(SportFilterContext);
  if (!ctx) throw new Error("useSportFilter must be used inside SportFilterProvider");
  return ctx;
}

/** The selector in the top bar. */
export function GlobalSportSelect() {
  const { sport, setSport } = useSportFilter();
  return (
    <label className="flex items-center gap-2">
      <span className="caption-1 shrink-0 text-ink-2">Sport</span>
      <span className="w-44">
        <SportSelect value={sport} onChange={setSport} allLabel="All sports" />
      </span>
    </label>
  );
}
