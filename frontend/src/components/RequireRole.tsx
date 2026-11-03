"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { Skeleton } from "@/components/ui";
import { homeFor } from "@/lib/format";
import type { Role } from "@/types";

// Page level guard for UX only. The backend is what actually blocks other roles (AGENTS.md §3).
export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowed = !!user && user.role === role;

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(homeFor(user.role));
  }, [loading, user, role, router]);

  if (!allowed) {
    return (
      <main id="main" className="mx-auto w-full max-w-4xl px-4 pt-24" role="status" aria-label="Loading">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </main>
    );
  }
  return <AppShell>{children}</AppShell>;
}
