import { RequireRole } from "@/components/RequireRole";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole role="coach">{children}</RequireRole>;
}
