"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Skeleton } from "@/components/ui";
import { homeFor } from "@/lib/format";

// Sends each person to their own home: coach to /coach, scout to /scout, player to /me.
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? homeFor(user.role) : "/login");
  }, [loading, user, router]);

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-24" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-40" />
    </main>
  );
}
