"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, Lock, Trophy, UserPlus, X } from "@phosphor-icons/react";
import { Button, Card, EmptyState, ErrorNote, LinkButton, ListSkeleton, MarkBadge, PageHeader, StatusBadge, cx } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import type { Mark, PracticeSession } from "@/types";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const { data, setData, error, loading, reload } = useLoad(() => api.sessions.get(id).then((r) => r.session), [id]);
  const [pending, setPending] = useState<string | null>(null); // playerId, or "all"
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);

  const session: PracticeSession | null = data;
  const locked = session?.status === "closed";
  const presentCount = session?.attendance.filter((a) => a.mark === "present").length ?? 0;
  const unmarked = session ? session.attendance.filter((a) => !a.mark) : [];

  async function mark(marks: { playerId: string; mark: Mark }[], busyKey: string) {
    if (!session) return;
    setActionError(null);
    setPending(busyKey);
    try {
      const r = await api.sessions.mark(session.id, marks);
      setData(r.session);
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setPending(null);
    }
  }

  async function close() {
    if (!session) return;
    setActionError(null);
    setClosing(true);
    try {
      const r = await api.sessions.close(session.id);
      setData(r.session);
      setConfirming(false);
    } catch (e) {
      setActionError(errorMessage(e));
      setConfirming(false);
    } finally {
      setClosing(false);
    }
  }

  return (
    <>
      <Link
        href="/coach/sessions"
        className="motion-base mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1 caption-1 text-ink-2 hover:bg-hover hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden />
        All sessions
      </Link>

      {loading ? (
        <ListSkeleton />
      ) : error || !session ? (
        <ErrorNote onRetry={reload}>{error ?? "Session not found."}</ErrorNote>
      ) : (
        <>
          <PageHeader
            title={`${session.sport} session`}
            subtitle={formatDate(session.date)}
            action={<StatusBadge status={session.status} />}
          />

          {locked && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-ink-2">
                <Lock size={18} aria-hidden className="mt-0.5 shrink-0" />
                <p className="body-5">
                  This session is closed. Marks are final and count toward readiness.
                  {presentCount > 0
                    ? ` ${presentCount} ${presentCount === 1 ? "player was" : "players were"} present and can go on the match sheet.`
                    : " No one was present, so there is no one to put on a match sheet."}
                </p>
              </div>
              {presentCount > 0 && (
                <LinkButton
                  href={`/coach/matches/new?date=${session.date}&sport=${encodeURIComponent(session.sport)}`}
                  variant="action"
                  className="shrink-0"
                >
                  <Trophy size={18} aria-hidden />
                  Record the match for this session
                </LinkButton>
              )}
            </div>
          )}
          {actionError && (
            <div className="mb-4">
              <ErrorNote>{actionError}</ErrorNote>
            </div>
          )}

          {session.attendance.length === 0 ? (
            <EmptyState
              icon={<UserPlus size={32} aria-hidden />}
              title={`No ${session.sport} players on the roster`}
              body="Add players for this sport first. Players added after a session opens do not join it."
              action={<LinkButton href="/coach/players">Add a player</LinkButton>}
            />
          ) : (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
                <p className="body-5 text-ink-2">
                  {session.attendance.length - unmarked.length} of {session.attendance.length} marked
                </p>
                {!locked && (
                  <Button
                    size="sm"
                    variant="secondary"
                    busy={pending === "all"}
                    onClick={() =>
                      mark(
                        session.attendance.map((a) => ({ playerId: a.playerId, mark: "present" as const })),
                        "all"
                      )
                    }
                  >
                    <Check size={16} aria-hidden />
                    Mark everyone present
                  </Button>
                )}
              </div>

              <ul>
                {session.attendance.map((a) => (
                  <li key={a.playerId} className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 first:border-t-0">
                    <p className="title-3 min-w-0 truncate text-ink">{a.playerName}</p>
                    {locked ? (
                      <MarkBadge mark={a.mark} />
                    ) : (
                      <div role="group" aria-label={`Attendance for ${a.playerName}`} className="flex gap-2">
                        {(["present", "absent"] as const).map((m) => {
                          const on = a.mark === m;
                          return (
                            <Button
                              key={m}
                              size="sm"
                              variant="secondary"
                              aria-pressed={on}
                              busy={pending === a.playerId}
                              onClick={() => !on && mark([{ playerId: a.playerId, mark: m }], a.playerId)}
                              className={cx(
                                "min-w-24",
                                on && m === "present" && "!border-accent !bg-primary !text-on-primary",
                                on && m === "absent" && "!border-bad-line !bg-bad !text-on-primary"
                              )}
                            >
                              {m === "present" ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
                              {m === "present" ? "Present" : "Absent"}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {!locked && session.attendance.length > 0 && (
            <div className="mt-6 flex flex-col gap-3">
              {unmarked.length > 0 && (
                <p className="body-5 text-highlight-ink">
                  Mark every player before closing. Still to mark: {unmarked.map((a) => a.playerName).join(", ")}.
                </p>
              )}
              {confirming ? (
                <div role="alertdialog" aria-label="Confirm closing" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
                  <p className="body-4 text-ink">Close this session? Marks become final and count toward readiness.</p>
                  <div className="flex gap-2">
                    <Button busy={closing} onClick={close}>
                      <Lock size={18} aria-hidden />
                      {closing ? "Closing" : "Yes, close session"}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirming(false)} disabled={closing}>
                      Keep open
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button disabled={unmarked.length > 0} onClick={() => setConfirming(true)}>
                    <Lock size={18} aria-hidden />
                    Close session
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
