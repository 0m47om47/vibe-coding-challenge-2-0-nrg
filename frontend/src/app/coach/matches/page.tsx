"use client";

import { Plus, SoccerBall } from "@phosphor-icons/react";
import { Badge, EmptyState, ErrorNote, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";

export default function MatchesPage() {
  const { data, error, loading, reload } = useLoad(() => api.matches.list());
  const matches = data?.matches ?? [];

  return (
    <>
      <PageHeader
        title="Matches"
        subtitle="Each match lists only the players who were present that day, with their scores."
        action={
          <LinkButton href="/coach/matches/new">
            <Plus size={20} aria-hidden />
            Record a match
          </LinkButton>
        }
      />

      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorNote onRetry={reload}>{error}</ErrorNote>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<SoccerBall size={32} aria-hidden />}
          title="No matches yet"
          body="Mark and close a session first, then record the match for the same day. Only players who were present can be scored."
          action={<LinkButton href="/coach/matches/new">Record a match</LinkButton>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((m) => (
            <li key={m.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="title-3">Against {m.opponent}</p>
                  <p className="caption-5 text-muted">
                    {formatDate(m.date)} · {m.sport}
                  </p>
                </div>
                <Badge>{m.scores.length} {m.scores.length === 1 ? "player" : "players"}</Badge>
              </div>
              <ul className="flex flex-wrap gap-2">
                {m.scores.map((s) => (
                  <li key={s.playerId} className="flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2">
                    <span className="body-5">{s.playerName}</span>
                    <span className="body-4 text-ok">{s.score}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
