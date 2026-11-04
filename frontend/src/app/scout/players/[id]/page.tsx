"use client";

import { useParams } from "next/navigation";
import { PlayerProfile } from "@/components/PlayerProfile";

// The backend answers 404 for a player who is not Ready, so a scout cannot open anyone else here.
export default function ScoutPlayerPage() {
  const { id } = useParams<{ id: string }>();
  return <PlayerProfile playerId={id} back={{ href: "/scout", label: "Ready players" }} />;
}
