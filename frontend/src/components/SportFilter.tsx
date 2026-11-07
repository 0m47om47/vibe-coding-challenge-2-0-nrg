"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SPORT_DOT, cx } from "@/components/ui";
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
  const { user } = useAuth();
  const academySports = user?.academy.sports;

  // A remembered sport from another academy, or one this academy dropped, falls back to all sports.
  useEffect(() => {
    if (sport && academySports && !academySports.includes(sport)) setSportState("");
  }, [sport, academySports]);

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

/**
 * The sport bar: one button per sport the academy runs, plus All sports, shown above every list it filters
 * (Ready board, Players, Sessions, Matches, Profiles, the scout's list). The choice carries over between pages.
 */
export function SportBar() {
  const { sport, setSport } = useSportFilter();
  const { user } = useAuth();
  const sports = user?.academy.sports ?? [];
  if (sports.length < 2) return null; // one sport: nothing to choose
  const options: (Sport | "")[] = ["", ...sports];

  // A radio group: arrow keys move the choice, as people expect.
  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = options[(options.indexOf(sport) + step + options.length) % options.length];
    setSport(next);
    document.getElementById(`sport-opt-${next || "all"}`)?.focus();
  }

  return (
    <div className="mb-6 rounded-2xl border border-line bg-surface p-2">
      <div role="radiogroup" aria-label="Sport" onKeyDown={onKeyDown} className="flex flex-wrap items-center gap-1">
        <span aria-hidden className="caption-1 w-full shrink-0 px-2 text-ink-2 sm:w-auto">
          Sport
        </span>
        {options.map((s) => {
          const on = sport === s;
          return (
            <button
              key={s || "all"}
              id={`sport-opt-${s || "all"}`}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setSport(s)}
              className={cx(
                "motion-base flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 button-sm",
                on ? "bg-primary text-on-primary" : "text-ink-2 hover:bg-hover hover:text-ink"
              )}
            >
              {s && <span aria-hidden className={cx("size-2 rounded-full ring-1 ring-ink/15", SPORT_DOT[s])} />}
              {s || "All sports"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
