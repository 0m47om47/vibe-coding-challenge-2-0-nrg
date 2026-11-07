import { RequireRole } from "@/components/RequireRole";

export default function ScoutLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole role="scout">{children}</RequireRole>;
}
