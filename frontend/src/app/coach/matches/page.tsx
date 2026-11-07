"use client";

import { SPORT_STATS, statText } from "@/lib/sportStats";
import { Plus, SoccerBall } from "@phosphor-icons/react";
import { EmptyState, ErrorNote, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { useSportFilter } from "@/components/SportFilter";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";

export default function MatchesPage() {
  const { data, error, loading, reload } = useLoad(() => api.matches.list());
  const { sport } = useSportFilter();
  const matches = (data?.matches ?? []).filter((m) => !sport || m.sport === sport);

  return (
    <>
      <PageHeader
        title="Matches"
        subtitle="Each match lists only the players who were present that day, with what they did."
        action={
          <LinkButton href="/coach/matches/new">
            <Plus size={18} aria-hidden />
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
          title={sport ? `No ${sport} matches yet` : "No matches yet"}
          body="Mark and close a session first, then record the match for the same day. Only players who were present can be scored."
          action={<LinkButton href="/coach/matches/new">Record a match</LinkButton>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((m) => (
            <li key={m.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="mb-3">
                <p className="title-2 text-ink">Against {m.opponent}</p>
                <p className="caption-5 text-muted">
                  {formatDate(m.date)}, {m.sport}
                </p>
              </div>
              <dl className="flex flex-col gap-2">
                {m.scores.map((s) => (
                  <div key={s.playerId} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <dt className="body-5 min-w-24 text-ink-2">{s.playerName}</dt>
                    <dd className="body-5 text-ink">
                      {SPORT_STATS[m.sport].map((f) => statText(f, s.stats[f.key] ?? 0)).join(", ")}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
