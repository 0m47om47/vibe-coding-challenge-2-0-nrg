"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarPlus } from "@phosphor-icons/react";
import { SportSelect } from "@/components/SportSelect";
import { Button, Card, EmptyState, ErrorNote, Field, LinkButton, ListSkeleton, PageHeader, inputClass, cx } from "@/components/ui";
import { api, ApiRequestError, errorMessage } from "@/lib/api";
import { formatDate, todayISO } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import type { RefusedPlayer, Sport } from "@/types";

export default function NewMatchPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [sport, setSport] = useState<Sport>("Football");
  const [opponent, setOpponent] = useState("");
  const [played, setPlayed] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState<RefusedPlayer[]>([]);

  // Everyone of this sport, and which of them were present that day.
  const { data, error: loadError, loading, reload } = useLoad(async () => {
    const [all, eligible] = await Promise.all([api.players.list(sport), api.matches.eligible(date, sport)]);
    return { all: all.players, presentIds: new Set(eligible.players.map((p) => p.id)) };
  }, [date, sport]);

  const roster = data?.all ?? [];
  const presentIds = data?.presentIds ?? new Set<string>();
  const chosen = roster.filter((p) => presentIds.has(p.id) && played[p.id]);

  function changeDay(next: () => void) {
    next();
    setPlayed({});
    setScores({});
    setError(null);
    setRefused([]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRefused([]);
    if (!date) return setError("Pick the match date.");
    if (!opponent.trim()) return setError("Enter the opponent's name.");
    if (chosen.length === 0) return setError("Tick at least one player who played, and enter a score.");

    const sheet = chosen.map((p) => ({ playerId: p.id, score: Number(scores[p.id] ?? "") }));
    const bad = chosen.find((p, i) => scores[p.id] === undefined || scores[p.id] === "" || !Number.isInteger(sheet[i].score) || sheet[i].score < 0);
    if (bad) return setError(`Enter a score for ${bad.name}. Use a whole number, 0 or more.`);

    setBusy(true);
    try {
      await api.matches.create({ date, sport, opponent: opponent.trim(), scores: sheet });
      router.push("/coach/matches");
    } catch (err) {
      setError(errorMessage(err));
      const details = err instanceof ApiRequestError ? (err.details as { refused?: RefusedPlayer[] } | undefined) : undefined;
      if (details?.refused) setRefused(details.refused);
      setBusy(false);
      reload(); // attendance may have changed since the list loaded
    }
  }

  return (
    <>
      <Link href="/coach/matches" className="motion-base mb-4 inline-flex items-center gap-2 rounded-lg px-1 py-1 caption-1 text-muted hover:text-white">
        <ArrowLeft size={16} aria-hidden />
        All matches
      </Link>
      <PageHeader
        title="Record a match"
        subtitle="Only players marked Present in a session of that sport on that date can go on the score sheet."
      />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <Card className="grid gap-4 p-6 sm:grid-cols-3">
          <Field label="Date">
            <input type="date" className={inputClass} value={date} onChange={(e) => changeDay(() => setDate(e.target.value))} />
          </Field>
          <Field label="Sport">
            <SportSelect value={sport} onChange={(v) => changeDay(() => setSport(v))} />
          </Field>
          <Field label="Opponent">
            <input className={inputClass} value={opponent} onChange={(e) => setOpponent(e.target.value)} autoComplete="off" />
          </Field>
        </Card>

        <div>
          <h2 className="title-2 mb-3">Score sheet for {date ? formatDate(date) : "the chosen date"}</h2>
          {loading ? (
            <ListSkeleton rows={3} />
          ) : loadError ? (
            <ErrorNote onRetry={reload}>{loadError}</ErrorNote>
          ) : roster.length === 0 ? (
            <EmptyState
              title={`No ${sport} players yet`}
              body="Add players for this sport before recording a match."
              action={<LinkButton href="/coach/players">Add a player</LinkButton>}
            />
          ) : presentIds.size === 0 ? (
            <EmptyState
              icon={<CalendarPlus size={32} aria-hidden />}
              title="No one was marked present that day"
              body={`There is no ${sport} session with present players on ${date ? formatDate(date) : "this date"}. Open a session, mark attendance, and come back.`}
              action={<LinkButton href="/coach/sessions">Go to sessions</LinkButton>}
            />
          ) : (
            <Card>
              <ul>
                {roster.map((p) => {
                  const here = presentIds.has(p.id);
                  const on = here && !!played[p.id];
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 first:border-t-0">
                      <label className={cx("flex min-w-0 items-center gap-3", here ? "cursor-pointer" : "opacity-60")}>
                        <input
                          type="checkbox"
                          className="size-5 accent-white"
                          disabled={!here}
                          checked={on}
                          onChange={(e) => setPlayed((s) => ({ ...s, [p.id]: e.target.checked }))}
                        />
                        <span className="min-w-0">
                          <span className="title-3 block truncate">{p.name}</span>
                          <span className="caption-5 text-muted">
                            {here ? "Present, can be scored" : "Not on the sheet: absent or not marked that day"}
                          </span>
                        </span>
                      </label>
                      {here && (
                        <label className="flex items-center gap-2">
                          <span className="caption-1 text-muted">Score</span>
                          <input
                            className={cx(inputClass, "!w-20 text-center")}
                            inputMode="numeric"
                            disabled={!on}
                            value={scores[p.id] ?? ""}
                            onChange={(e) => setScores((s) => ({ ...s, [p.id]: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                            aria-label={`Score for ${p.name}`}
                          />
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        {error && (
          <div className="flex flex-col gap-2">
            <ErrorNote>{error}</ErrorNote>
            {refused.length > 0 && (
              <ul className="flex flex-col gap-1 pl-2">
                {refused.map((r) => (
                  <li key={r.playerId} className="body-6 text-bad">
                    {r.playerName} {r.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" busy={busy} disabled={loading || presentIds.size === 0}>
            {busy ? "Saving" : "Save match"}
          </Button>
          <LinkButton href="/coach/matches" variant="ghost">
            Cancel
          </LinkButton>
        </div>
      </form>
    </>
  );
}
