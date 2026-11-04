"use client";

import { Medal } from "@phosphor-icons/react";
import { PlayersView } from "@/components/PlayersView";
import { EmptyState, ErrorNote, ListSkeleton, PageHeader } from "@/components/ui";
import { useSportFilter } from "@/components/SportFilter";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";

// The backend already sends a scout only the Ready players. Nothing here filters or hides anyone.
export default function ScoutPage() {
  const { sport } = useSportFilter();
  const { data, error, loading, reload } = useLoad(() => api.players.list(sport || undefined), [sport]);
  const players = data?.players ?? [];

  return (
    <>
      <PageHeader
        title="Ready for a trial"
        subtitle={
          loading || error
            ? "Players with at least 75% attendance and at least 2 matches."
            : `${players.length} ${players.length === 1 ? "player has" : "players have"} at least 75% attendance and at least 2 matches.`
        }
      />

      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorNote onRetry={reload}>{error}</ErrorNote>
      ) : players.length === 0 ? (
        <EmptyState
          icon={<Medal size={32} aria-hidden />}
          title={sport ? `No one in ${sport} is ready yet` : "No one is ready yet"}
          body="A player appears here once they reach 75% attendance and play at least 2 matches. Check back after the next session."
        />
      ) : (
        <PlayersView players={players} />
      )}
    </>
  );
}
