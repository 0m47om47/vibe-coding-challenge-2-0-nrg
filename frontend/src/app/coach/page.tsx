"use client";

import { UserPlus } from "@phosphor-icons/react";
import { PlayersView } from "@/components/PlayersView";
import { useSportFilter } from "@/components/SportFilter";
import { EmptyState, ErrorNote, LinkButton, ListSkeleton, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { pctLabel } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";

export default function ReadyBoardPage() {
  const { sport } = useSportFilter();
  const { data, error, loading, reload } = useLoad(() => api.players.list(sport || undefined), [sport]);
  const players = data?.players ?? [];

  const ready = players.filter((p) => p.ready).length;
  const withSessions = players.filter((p) => p.sessionsHeld > 0);
  const avg = withSessions.length
    ? Math.round((withSessions.reduce((n, p) => n + p.attendancePct, 0) / withSessions.length) * 10) / 10
    : 0;

  const totals: [string, string | null][] = [
    ["Players", loading ? null : String(players.length)],
    ["Ready", loading ? null : String(ready)],
    ["Average attendance", loading ? null : pctLabel(avg)],
  ];

  return (
    <>
      <PageHeader
        title="Ready board"
        subtitle="Ready means at least 75% attendance and at least 2 matches. The board updates as you close sessions and record matches."
      />

      <dl className="mb-6 grid grid-cols-3 gap-3">
        {totals.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-dark bg-dark p-5">
            <dt className="caption-4 text-on-dark/70">{label}</dt>
            <dd className="heading-5 md:heading-4 font-mono font-bold text-primary-soft">{value ?? <Skeleton className="mt-1 h-7 w-12" />}</dd>
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
        <PlayersView players={players} />
      )}
    </>
  );
}
