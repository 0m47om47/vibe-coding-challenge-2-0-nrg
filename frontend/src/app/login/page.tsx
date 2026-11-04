"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button, Card, ErrorNote, Field, inputClass } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { homeFor } from "@/lib/format";

const DEMO = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

const DEMO_ACCOUNTS = [
  { label: "Coach", username: "coach", password: "coach123" },
  { label: "Scout", username: "scout", password: "scout123" },
  { label: "Player", username: "chandan", password: "chandan123" },
];

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

  async function performLogin(u: string, p: string) {
    setError(null);
    if (!u.trim()) return setError("Enter your username.");
    if (!p) return setError("Enter your password.");
    setBusy(true);
    try {
      const res = await login(u.trim(), p);
      router.replace(homeFor(res.role));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await performLogin(username, password);
  }

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <p className="body-5 text-ink-2">Dumka Sports Academy</p>
        <h1 className="heading-4 text-ink">Sign in</h1>
        <p className="body-5 text-ink-2">
          Coaches mark attendance and record matches. Scouts see who is ready for a trial. Players see their own record.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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
      </Card>

      {DEMO && (
        <div className="flex flex-col gap-2">
          <p className="caption-4 text-muted">Demo mode with sample data. Sign in as:</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <Button
                key={a.username}
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setUsername(a.username);
                  setPassword(a.password);
                  performLogin(a.username, a.password);
                }}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
