"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AuthShell } from "@/components/AuthShell";
import { Button, Card, ErrorNote, Field, Notice, inputClass } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { homeFor } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";

// Public page. Signing up only creates a pending account: the coach has to approve it before any player data is visible.
export default function RegisterScoutPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [academyId, setAcademyId] = useState("");
  const academies = useLoad(() => api.academies.list());

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user.role));
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const mail = email.trim().toLowerCase();
    if (!academyId) return setError("Choose the academy you want to scout.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password needs at least 6 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      const r = await api.auth.registerScout(mail, password, academyId);
      setSent(r.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="heading-4 text-ink">Scout access</h1>
        <p className="body-5 text-ink-2">
          Choose the academy you want to scout and sign up with your email. You can sign in once a coach of that academy approves your request.
        </p>
      </div>

      <Card className="p-6">
        {sent ? (
          <div className="flex flex-col gap-4">
            <Notice>{sent}</Notice>
            <p className="body-5 text-ink-2">
              Tell the academy's coach you signed up as <span className="font-semibold text-ink">{email.trim().toLowerCase()}</span>. Until they approve it, you will not see any players.
            </p>
            <Link href="/login" className="body-4 text-link underline underline-offset-2">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <Field label="Academy" hint="Only this academy's coaches can approve you, and you will see only its players">
              <select className={inputClass} value={academyId} onChange={(e) => setAcademyId(e.target.value)} disabled={academies.loading}>
                <option value="">{academies.loading ? "Loading academies" : "Choose an academy"}</option>
                {(academies.data?.academies ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.town ? `${a.name}, ${a.town}` : a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
              />
            </Field>
            <Field label="Password" hint="At least 6 characters">
              <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirm password">
              <input className={inputClass} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </Field>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button variant="action" type="submit" busy={busy}>
              {busy ? "Sending request" : "Request access"}
            </Button>
          </form>
        )}
      </Card>

      {!sent && (
        <p className="body-5 text-ink-2">
          Already approved?{" "}
          <Link href="/login" className="font-semibold text-link underline underline-offset-2 hover:text-ink">
            Sign in
          </Link>
        </p>
      )}
      </div>
    </AuthShell>
  );
}
