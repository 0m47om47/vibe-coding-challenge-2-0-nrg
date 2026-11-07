"use client";

import { useState } from "react";
import { ShieldCheck, Users } from "@phosphor-icons/react";
import { PlayerManager } from "@/components/PlayerManager";
import { ScoutAccess } from "@/components/ScoutAccess";
import { PageHeader, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";

type Who = "players" | "scouts";

/**
 * Profile management starts with one question: whose profiles? Only that group's options are shown after the
 * choice, so the page stays short.
 */
export default function ProfilesPage() {
  const [who, setWho] = useState<Who | null>(null);
  // Counts for the two choices. Reloaded when the choice changes, so approving a scout shows up here.
  const counts = useLoad(async () => {
    const [players, scouts] = await Promise.all([api.players.list(), api.scouts.list()]);
    return { players: players.players.length, waiting: scouts.scouts.filter((s) => s.status === "pending").length, scouts: scouts.scouts.length };
  }, [who]);

  const choices: { id: Who; label: string; icon: React.ReactNode; hint: string }[] = [
    {
      id: "players",
      label: "Players",
      icon: <Users size={22} aria-hidden />,
      hint: counts.data ? `${counts.data.players} profiles. Add, find and edit.` : "Add, find and edit profiles.",
    },
    {
      id: "scouts",
      label: "Scouts",
      icon: <ShieldCheck size={22} aria-hidden />,
      hint: counts.data
        ? counts.data.waiting > 0
          ? `${counts.data.waiting} waiting for approval`
          : `${counts.data.scouts} accounts. Create, approve, remove.`
        : "Create, approve and remove scouts.",
    },
  ];

  return (
    <>
      <PageHeader title="Profile management" subtitle="Choose whose profiles you want to manage." />

      <div role="tablist" aria-label="Whose profiles" className="mb-6 grid gap-3 sm:grid-cols-2">
        {choices.map((c) => {
          const on = who === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              id={`tab-${c.id}`}
              aria-selected={on}
              aria-controls={`panel-${c.id}`}
              onClick={() => setWho(c.id)}
              className={cx(
                "motion-base flex cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left active:scale-[0.99]",
                on ? "border-dark bg-dark text-on-dark" : "border-line bg-surface text-ink hover:bg-hover"
              )}
            >
              <span className={cx("flex size-11 shrink-0 items-center justify-center rounded-xl", on ? "bg-primary text-on-primary" : "bg-raised text-ink-2")}>{c.icon}</span>
              <span className="min-w-0">
                <span className="title-2 block">{c.label}</span>
                <span className={cx("caption-4 block", on ? "text-on-dark/70" : "text-muted")}>{c.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {who === null && <p className="body-5 text-muted">Pick Players or Scouts above to see what you can do.</p>}
      {who === "players" && (
        <div role="tabpanel" id="panel-players" aria-labelledby="tab-players">
          <PlayerManager />
        </div>
      )}
      {who === "scouts" && (
        <div role="tabpanel" id="panel-scouts" aria-labelledby="tab-scouts">
          <ScoutAccess />
        </div>
      )}
    </>
  );
}
