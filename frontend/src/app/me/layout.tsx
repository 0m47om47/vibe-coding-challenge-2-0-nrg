import { RequireRole } from "@/components/RequireRole";

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole role="player">{children}</RequireRole>;
}
