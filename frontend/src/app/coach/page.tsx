"use client";

import { useState } from "react";
import { UserPlus } from "@phosphor-icons/react";
import { PlayerTable } from "@/components/PlayerTable";
import { SportSelect } from "@/components/SportSelect";
import { EmptyState, ErrorNote, Field, LinkButton, ListSkeleton, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { pctLabel } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import type { Sport } from "@/types";

export default function ReadyBoardPage() {
  const [sport, setSport] = useState<Sport | "">("");
  const { data, error, loading, reload } = useLoad(() => api.players.list(sport || undefined), [sport]);
  const players = data?.players ?? [];

  const ready = players.filter((p) => p.ready).length;
  const withSessions = players.filter((p) => p.sessionsHeld > 0);
  const avg = withSessions.length
    ? Math.round((withSessions.reduce((n, p) => n + p.attendancePct, 0) / withSessions.length) * 10) / 10
    : 0;

  return (
    <>
      <PageHeader
        title="Ready board"
        subtitle="Ready means at least 75% attendance and at least 2 matches. The list updates as you close sessions and record matches."
        action={
          <div className="w-full sm:w-48">
            <Field label="Sport">
              <SportSelect value={sport} onChange={setSport} allLabel="All sports" />
            </Field>
          </div>
        }
      />

      <dl className="mb-6 grid grid-cols-3 gap-3">
        {[
          ["Players", loading ? null : String(players.length)],
          ["Ready", loading ? null : String(ready)],
          ["Average attendance", loading ? null : pctLabel(avg)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-4">
            <dt className="caption-4 text-muted">{label}</dt>
            <dd className="heading-5 md:heading-4">{value ?? <Skeleton className="mt-1 h-6 w-12" />}</dd>
          </div>
        ))}
      </dl>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorNote onRetry={reload}>{error}</ErrorNote>
      ) : players.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={32} aria-hidden />}
          title={sport ? `No ${sport} players yet` : "No players yet"}
          body="Add your first player. Then open a session, mark who came, and this board fills in."
          action={<LinkButton href="/coach/players">Add a player</LinkButton>}
        />
      ) : (
        <PlayerTable players={players} />
      )}
    </>
  );
}
