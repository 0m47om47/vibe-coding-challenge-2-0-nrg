"use client";

import { UserPlus } from "@phosphor-icons/react";
import { PlayersView } from "@/components/PlayersView";
import { useSportFilter } from "@/components/SportFilter";
import { EmptyState, ErrorNote, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";

export default function PlayersPage() {
  const { sport } = useSportFilter();
  const { data, error, loading, reload } = useLoad(() => api.players.list(sport || undefined), [sport]);
  const players = data?.players ?? [];

  return (
    <>
      <PageHeader
        title="Players"
        subtitle="Everyone in the academy with attendance, matches and Ready status. Open a player for the full profile."
        action={<LinkButton href="/coach/profiles">Manage profiles</LinkButton>}
      />

      <h2 className="title-2 mb-3 text-ink">All players</h2>
      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorNote onRetry={reload}>{error}</ErrorNote>
      ) : players.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={32} aria-hidden />}
          title={sport ? `No ${sport} players yet` : "No players yet"}
          body="Create the first player in Profile management. Their login is created at the same time."
          action={<LinkButton href="/coach/profiles">Manage profiles</LinkButton>}
        />
      ) : (
        <PlayersView players={players} defaultView="table" />
      )}
    </>
  );
}
