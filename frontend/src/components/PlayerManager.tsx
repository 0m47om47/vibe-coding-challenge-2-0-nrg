"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlass, Plus, UserPlus, X } from "@phosphor-icons/react";
import { useAuth } from "@/components/AuthProvider";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useSportFilter } from "@/components/SportFilter";
import { SportSelect } from "@/components/SportSelect";
import { Button, Card, EmptyState, ErrorNote, Field, LinkButton, ListSkeleton, Notice, SportTag, inputClass } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import type { Sport } from "@/types";

const blank = { name: "", age: "", sport: "Football" as Sport, username: "", password: "" };

/** Coach only. Find a player to edit, or add a new one. The add form stays closed until it is asked for. */
export function PlayerManager() {
  const { sport } = useSportFilter();
  const { user } = useAuth();
  const firstSport = user?.academy.sports[0] ?? "Football";
  const { data, error, loading, reload } = useLoad(() => api.players.list(sport || undefined), [sport]);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...blank, sport: firstSport });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  // The add form starts on the sport chosen in the top bar.
  useEffect(() => {
    if (sport) setForm((f) => ({ ...f, sport }));
  }, [sport]);

  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const players = (data?.players ?? []).filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setAdded(null);

    const name = form.name.trim();
    const age = Number(form.age);
    const username = form.username.trim().toLowerCase();
    if (!name) return setFormError("Enter the player's name.");
    if (!Number.isInteger(age) || age < 3 || age > 100) return setFormError("Age must be a whole number between 3 and 100.");
    if (username.length < 3 || !/^[a-z0-9_.-]+$/.test(username)) {
      return setFormError("Username needs at least 3 characters: letters, numbers, dot, dash or underscore.");
    }
    if (form.password.length < 6) return setFormError("Password needs at least 6 characters.");

    setBusy(true);
    try {
      await api.players.create({ name, age, sport: form.sport, username, password: form.password });
      setAdded(`${name} was added. They can sign in as ${username}.`);
      setForm({ ...blank, sport: form.sport });
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-60">
          <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className={`${inputClass} pl-10`}
            aria-label="Filter profiles by name"
            placeholder="Filter profiles by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Button variant={adding ? "secondary" : "action"} aria-expanded={adding} onClick={() => setAdding((a) => !a)}>
          {adding ? <X size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
          {adding ? "Close" : "Add player"}
        </Button>
      </div>

      {added && !adding && <Notice>{added}</Notice>}

      {adding && (
        <Card className="p-5">
          <h3 className="title-3 mb-4 text-ink">New player</h3>
          <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" className="sm:col-span-2">
              <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Age">
              <input className={inputClass} inputMode="numeric" value={form.age} onChange={(e) => set("age", e.target.value.replace(/\D/g, "").slice(0, 3))} autoComplete="off" />
            </Field>
            <Field label="Sport">
              <SportSelect value={form.sport} onChange={(v) => set("sport", v)} />
            </Field>
            <Field label="Login username" hint="Letters, numbers, dot, dash or underscore">
              <input className={inputClass} value={form.username} onChange={(e) => set("username", e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} />
            </Field>
            <Field label="Login password" hint="At least 6 characters">
              <input className={inputClass} type="text" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="off" />
            </Field>
            <div className="flex flex-col gap-3 sm:col-span-3">
              {formError && <ErrorNote>{formError}</ErrorNote>}
              {added && <Notice>{added}</Notice>}
              <div>
                <Button variant="action" type="submit" busy={busy}>
                  <UserPlus size={18} aria-hidden />
                  {busy ? "Adding" : "Add player"}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorNote onRetry={reload}>{error}</ErrorNote>
      ) : players.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={32} aria-hidden />}
          title={query ? `No profile called "${query.trim()}"` : sport ? `No ${sport} profiles yet` : "No profiles yet"}
          body={query ? "Check the spelling, or clear the filter." : "Use Add player to create the first profile. The player's login is created at the same time."}
        />
      ) : (
        <Card>
          <ul>
            {players.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
                <div className="flex min-w-0 items-center gap-3">
                  <PlayerAvatar player={p} />
                  <div className="min-w-0">
                    <p className="body-4 truncate text-ink">{p.name}</p>
                    <p className="flex items-center gap-2 caption-5 text-muted">
                      <SportTag sport={p.sport} />
                      <span>Age {p.age}{p.photoUrl ? "" : ", no photo yet"}</span>
                    </p>
                  </div>
                </div>
                <LinkButton href={`/coach/players/${p.id}?edit=1`} variant="secondary" size="sm" aria-label={`Edit profile of ${p.name}`}>
                  Edit profile
                </LinkButton>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
