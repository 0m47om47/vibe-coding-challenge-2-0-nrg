"use client";

import { AuthShell } from "@/components/AuthShell";
import { AuthTabs } from "@/components/AuthTabs";

export default function LoginPage() {
  return (
    <AuthShell>
      <AuthTabs initial="signin" />
    </AuthShell>
  );
}
