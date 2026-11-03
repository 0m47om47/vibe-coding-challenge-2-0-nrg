"use client";

import { CheckCircle, Circle } from "@phosphor-icons/react";
import { Meter } from "@/components/PlayerTable";
import { Card, EmptyState, ErrorNote, ListSkeleton, PageHeader, ReadyBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { pctLabel, readyGaps } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";

// A player sees only their own row. The backend returns just that one player.
export default function MyRowPage() {
  const { data, error, loading, reload } = useLoad(() => api.players.list());
  const me = data?.players[0];

  return (
    <>
      <PageHeader title="My row" subtitle="Your attendance and matches, and what is left to become Ready." />
      {loading ? (
        <ListSkeleton rows={2} />
      ) : error ? (
        <ErrorNote onRetry={reload}>{error}</ErrorNote>
      ) : !me ? (
        <EmptyState
          title="No player record found"
          body="Your login is not linked to a player yet. Ask your coach to check your account."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="heading-5 truncate">{me.name}</h2>
                <p className="body-6 text-muted">
                  {me.sport} · Age {me.age}
                </p>
              </div>
              <ReadyBadge ready={me.ready} />
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="heading-4">{pctLabel(me.attendancePct)}</p>
                <p className="caption-2 text-muted">
                  {me.sessionsHeld === 0
                    ? "No sessions held yet"
                    : `Present at ${me.sessionsPresent} of ${me.sessionsHeld} sessions`}
                </p>
              </div>
              <Meter pct={me.attendancePct} ready={me.ready} />
              <p className="caption-5 mt-2 text-muted">The line marks 75%, the attendance needed to be Ready.</p>
            </div>

            <dl className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-line bg-raised p-4">
                <dt className="caption-4 text-muted">Matches played</dt>
                <dd className="heading-5">{me.matchesPlayed}</dd>
              </div>
              <div className="rounded-lg border border-line bg-raised p-4">
                <dt className="caption-4 text-muted">Sessions attended</dt>
                <dd className="heading-5">{me.sessionsPresent}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="title-2 mb-3">{me.ready ? "You are Ready for a trial" : "What is left to become Ready"}</h2>
            {me.ready ? (
              <p className="body-6 flex items-center gap-2 text-ok">
                <CheckCircle size={20} weight="fill" aria-hidden />
                You have at least 75% attendance and at least 2 matches. Scouts can see you.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {readyGaps(me).map((g) => (
                  <li key={g} className="body-6 flex items-center gap-2 text-muted">
                    <Circle size={20} aria-hidden className="shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
