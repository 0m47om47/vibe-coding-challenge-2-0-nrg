"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button, ErrorNote, Field, inputClass } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { homeFor } from "@/lib/format";

const DEMO = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user.role));
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim()) return setError("Enter your username.");
    if (!password) return setError("Enter your password.");
    setBusy(true);
    try {
      const u = await login(username.trim(), password);
      router.replace(homeFor(u.role));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <p className="caption-3 text-muted">Academy Desk</p>
        <h1 className="heading-4">Sign in to the desk</h1>
        <p className="body-6 text-muted">
          Coaches mark attendance and record matches. Scouts see who is ready. Players see their own row.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
        <Field label="Username">
          <input
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
          />
        </Field>
        <Field label="Password">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" busy={busy}>
          {busy ? "Signing in" : "Sign in"}
        </Button>
      </form>

      {DEMO && (
        <p className="caption-5 text-muted">
          Demo mode with sample data. Try coach and coach123, scout and scout123, or chandan and chandan123.
        </p>
      )}
    </main>
  );
}
