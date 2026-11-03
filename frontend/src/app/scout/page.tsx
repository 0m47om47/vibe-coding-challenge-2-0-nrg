"use client";

import { Medal } from "@phosphor-icons/react";
import { PlayerTable } from "@/components/PlayerTable";
import { EmptyState, ErrorNote, ListSkeleton, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";

// The backend already sends a scout only the Ready players. Nothing here filters or hides anyone.
export default function ScoutPage() {
  const { data, error, loading, reload } = useLoad(() => api.players.list());
  const players = data?.players ?? [];

  return (
    <>
      <PageHeader
        title="Ready for a trial"
        subtitle="Players with at least 75% attendance and at least 2 matches played."
      />
      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorNote onRetry={reload}>{error}</ErrorNote>
      ) : players.length === 0 ? (
        <EmptyState
          icon={<Medal size={32} aria-hidden />}
          title="No one is ready yet"
          body="A player appears here once they reach 75% attendance and play at least 2 matches. Check back after the next session."
        />
      ) : (
        <PlayerTable players={players} />
      )}
    </>
  );
}
