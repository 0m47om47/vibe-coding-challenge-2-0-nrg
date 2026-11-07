"use client";

import { useAuth } from "@/components/AuthProvider";
import { PlayerProfile, PlayerProfileEmpty } from "@/components/PlayerProfile";

// A player sees only their own profile. The backend refuses anyone else's.
export default function MyProfilePage() {
  const { user } = useAuth();
  return user?.playerId ? <PlayerProfile playerId={user.playerId} /> : <PlayerProfileEmpty />;
}
