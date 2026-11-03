"use client";

import { useState } from "react";
import { UserPlus } from "@phosphor-icons/react";
import { PlayerTable } from "@/components/PlayerTable";
import { SportSelect } from "@/components/SportSelect";
import { Button, Card, EmptyState, ErrorNote, Field, ListSkeleton, Notice, PageHeader, inputClass } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import type { Sport } from "@/types";

const blank = { name: "", age: "", sport: "Football" as Sport, username: "", password: "" };

export default function PlayersPage() {
  const { data, error, loading, reload } = useLoad(() => api.players.list());
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const players = data?.players ?? [];

  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setForm((f) => ({ ...f, [k]: v }));

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
    <>
      <PageHeader
        title="Players"
        subtitle="Add a player and their login together. Players join the roster of any new session in their sport."
      />

      <Card className="mb-8 p-6">
        <h2 className="title-2 mb-4">Add a player</h2>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Age">
            <input
              className={inputClass}
              inputMode="numeric"
              value={form.age}
              onChange={(e) => set("age", e.target.value.replace(/\D/g, "").slice(0, 3))}
              autoComplete="off"
            />
          </Field>
          <Field label="Sport" className="sm:col-span-2">
            <SportSelect value={form.sport} onChange={(v) => set("sport", v)} />
          </Field>
          <Field label="Login username" hint="Letters, numbers, dot, dash or underscore">
            <input
              className={inputClass}
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
          <Field label="Login password" hint="At least 6 characters">
            <input
              className={inputClass}
              type="text"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              autoComplete="off"
            />
          </Field>
          <div className="flex flex-col gap-3 sm:col-span-2">
            {formError && <ErrorNote>{formError}</ErrorNote>}
            {added && <Notice>{added}</Notice>}
            <div>
              <Button type="submit" busy={busy}>
                <UserPlus size={20} aria-hidden />
                {busy ? "Adding" : "Add player"}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <h2 className="title-2 mb-3">All players</h2>
      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorNote onRetry={reload}>{error}</ErrorNote>
      ) : players.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={32} aria-hidden />}
          title="No players yet"
          body="Use the form above to add the first player. Their login is created at the same time."
        />
      ) : (
        <PlayerTable players={players} />
      )}
    </>
  );
}
