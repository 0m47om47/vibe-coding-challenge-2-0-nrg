"use client";

import { AuthShell } from "@/components/AuthShell";
import { AuthTabs } from "@/components/AuthTabs";

// Same card as /login, opened on the Sign up tab.
export default function RegisterAcademyPage() {
  return (
    <AuthShell>
      <AuthTabs initial="signup" />
    </AuthShell>
  );
}
