"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Cards, Rows } from "@phosphor-icons/react";
import { useAuth } from "@/components/AuthProvider";
import { PlayerTable } from "@/components/PlayerTable";
import { SquadCarousel } from "@/components/SquadCarousel";
import { cx } from "@/components/ui";
import { profileHref } from "@/lib/format";
import type { PlayerStats } from "@/types";

type View = "cards" | "table";

/** A list of players as photo cards or as a table. Choosing a player opens their profile page. */
export function PlayersView({ players, defaultView = "table" }: { players: PlayerStats[]; defaultView?: View }) {
  const router = useRouter();
  const { user } = useAuth();
  const [view, setView] = useState<View>(defaultView);
  const open = (p: PlayerStats) => user && router.push(profileHref(user.role, p.id));

  const toggle = (value: View, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => setView(value)}
      className={cx(
        "motion-base flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 button-sm active:scale-[0.98]",
        view === value ? "bg-primary text-on-primary" : "text-ink-2 hover:bg-hover hover:text-on-primary"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <>
      <div role="group" aria-label="Choose how to show players" className="mb-4 inline-flex gap-1 rounded-lg border border-line bg-canvas p-1">
        {toggle("cards", "Photo cards", <Cards size={16} aria-hidden />)}
        {toggle("table", "Table", <Rows size={16} aria-hidden />)}
      </div>

      {view === "cards" ? <SquadCarousel players={players} onSelect={open} /> : <PlayerTable players={players} onSelect={open} />}
    </>
  );
}
