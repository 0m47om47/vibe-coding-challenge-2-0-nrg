"use client";

import { useState } from "react";
import { UserPlus, X } from "@phosphor-icons/react";
import { Button, Card, ErrorNote, Field, ListSkeleton, Notice, inputClass } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import type { CoachAccount } from "@/types";

/** Coach only. The coaches of this academy: add another coach, or remove one (never yourself). */
export function CoachManager() {
  const { data, error, loading, reload } = useLoad(() => api.coaches.list());
  const [adding, setAdding] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const coaches = data?.coaches ?? [];

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setDone(null);
    const login = username.trim().toLowerCase();
    if (login.length < 3 || !/^[a-z0-9_.-]+$/.test(login)) {
      return setFormError("Username needs at least 3 characters: letters, numbers, dot, dash or underscore.");
    }
    if (password.length < 6) return setFormError("Password needs at least 6 characters.");
    setBusy(true);
    try {
      await api.coaches.create(login, password);
      setDone(`${login} can now sign in as a coach of this academy.`);
      setUsername("");
      setPassword("");
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: CoachAccount) {
    setActionError(null);
    setWorking(c.id);
    try {
      await api.coaches.remove(c.id);
      setConfirming(null);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setWorking(null);
    }
  }

  return (
    <section aria-label="Coach accounts" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="body-5 max-w-[560px] text-ink-2">Every coach of the academy can manage players, sessions, matches, scouts and settings.</p>
        <Button variant={adding ? "secondary" : "action"} aria-expanded={adding} onClick={() => setAdding((a) => !a)}>
          {adding ? <X size={18} aria-hidden /> : <UserPlus size={18} aria-hidden />}
          {adding ? "Close" : "Add a coach"}
        </Button>
      </div>

      {adding && (
        <Card className="p-5">
          <form onSubmit={onCreate} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field label="Coach username" hint="Letters, numbers, dot, dash or underscore">
              <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} />
            </Field>
            <Field label="Coach password" hint="At least 6 characters">
              <input className={inputClass} type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            </Field>
            <div className="flex flex-col gap-3 sm:col-span-2">
              {formError && <ErrorNote>{formError}</ErrorNote>}
              <div>
                <Button variant="action" type="submit" busy={busy}>
                  <UserPlus size={18} aria-hidden />
                  {busy ? "Adding" : "Add coach"}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}
      {done && <Notice>{done}</Notice>}

      {loading ? (
        <ListSkeleton rows={2} />
      ) : error ? (
        <ErrorNote onRetry={reload}>{error}</ErrorNote>
      ) : (
        <Card>
          {actionError && (
            <div className="p-4">
              <ErrorNote>{actionError}</ErrorNote>
            </div>
          )}
          <ul>
            {coaches.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
                <div className="min-w-0">
                  <p className="body-4 truncate text-ink">
                    {c.username}
                    {c.you && <span className="caption-4 ml-2 text-muted">you</span>}
                  </p>
                  <p className="caption-5 text-muted">Coach since {formatDate(c.createdAt.slice(0, 10))}</p>
                </div>
                {c.you ? null : confirming === c.id ? (
                  <div className="flex items-center gap-2">
                    <span className="caption-1 text-ink-2">Remove this coach?</span>
                    <Button size="sm" variant="danger" busy={working === c.id} aria-label={`Confirm removing ${c.username}`} onClick={() => remove(c)}>
                      Yes, remove
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                      Keep
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" aria-label={`Remove ${c.username}`} onClick={() => setConfirming(c.id)}>
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
