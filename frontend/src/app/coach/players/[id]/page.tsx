"use client";

import { useParams } from "next/navigation";
import { PlayerProfile } from "@/components/PlayerProfile";

export default function CoachPlayerPage() {
  const { id } = useParams<{ id: string }>();
  return <PlayerProfile playerId={id} back={{ href: "/coach/players", label: "All players" }} />;
}
