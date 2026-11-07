"use client";

import { useState } from "react";
import { CheckCircle, UserPlus, X } from "@phosphor-icons/react";
import { Button, Card, ErrorNote, Field, ListSkeleton, Notice, inputClass } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import type { ScoutAccount } from "@/types";

/** Coach only. Scouts who signed up by email wait here; the coach can also create a scout directly. */
export function ScoutAccess() {
  const { data, error, loading, reload } = useLoad(() => api.scouts.list());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const scouts = data?.scouts ?? [];
  const pending = scouts.filter((s) => s.status === "pending");
  const active = scouts.filter((s) => s.status === "active");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setDone(null);
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return setFormError("Enter a valid email address.");
    if (password.length < 6) return setFormError("Password needs at least 6 characters.");
    setBusy(true);
    try {
      await api.scouts.create(mail, password);
      setDone(`${mail} can now sign in as a scout.`);
      setEmail("");
      setPassword("");
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function act(s: ScoutAccount, kind: "approve" | "remove") {
    setActionError(null);
    setWorking(s.id);
    try {
      if (kind === "approve") await api.scouts.approve(s.id);
      else await api.scouts.remove(s.id);
      setConfirming(null);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setWorking(null);
    }
  }

  return (
    <section aria-label="Scout access" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="body-5 max-w-[560px] text-ink-2">
          Scouts can ask for access with their email. They see no player until you approve.
        </p>
        <Button variant={creating ? "secondary" : "action"} aria-expanded={creating} onClick={() => setCreating((c) => !c)}>
          {creating ? <X size={18} aria-hidden /> : <UserPlus size={18} aria-hidden />}
          {creating ? "Close" : "Create a scout"}
        </Button>
      </div>

      {creating && (
        <Card className="p-5">
          <form onSubmit={onCreate} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field label="Scout email">
              <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} />
            </Field>
            <Field label="Scout password" hint="At least 6 characters">
              <input className={inputClass} type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            </Field>
            <div className="flex flex-col gap-3 sm:col-span-2">
              {formError && <ErrorNote>{formError}</ErrorNote>}
              <div>
                <Button variant="action" type="submit" busy={busy}>
                  <UserPlus size={18} aria-hidden />
                  {busy ? "Creating" : "Create scout"}
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
        <div className="flex flex-col gap-4">
          {actionError && <ErrorNote>{actionError}</ErrorNote>}

          <Card>
            <h3 className="title-3 border-b border-line px-4 py-3 text-ink">
              Waiting for approval <span className="text-muted">({pending.length})</span>
            </h3>
            {pending.length === 0 ? (
              <p className="body-5 px-4 py-3 text-muted">No requests right now. New sign-ups appear here.</p>
            ) : (
              <ul>
                {pending.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
                    <div className="min-w-0">
                      <p className="body-4 truncate text-ink">{s.email}</p>
                      <p className="caption-5 text-muted">Asked on {formatDate(s.createdAt.slice(0, 10))}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" busy={working === s.id} aria-label={`Approve ${s.email}`} onClick={() => act(s, "approve")}>
                        <CheckCircle size={16} aria-hidden />
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" disabled={working === s.id} aria-label={`Reject ${s.email}`} onClick={() => act(s, "remove")}>
                        <X size={16} aria-hidden />
                        Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 className="title-3 border-b border-line px-4 py-3 text-ink">
              Active scouts <span className="text-muted">({active.length})</span>
            </h3>
            {active.length === 0 ? (
              <p className="body-5 px-4 py-3 text-muted">No active scouts yet.</p>
            ) : (
              <ul>
                {active.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
                    <p className="body-4 min-w-0 truncate text-ink">{s.email}</p>
                    {confirming === s.id ? (
                      <div className="flex items-center gap-2">
                        <span className="caption-1 text-ink-2">Remove their access?</span>
                        <Button size="sm" variant="danger" busy={working === s.id} aria-label={`Confirm removing ${s.email}`} onClick={() => act(s, "remove")}>
                          Yes, remove
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                          Keep
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" aria-label={`Remove ${s.email}`} onClick={() => setConfirming(s.id)}>
                        Remove access
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </section>
  );
}
