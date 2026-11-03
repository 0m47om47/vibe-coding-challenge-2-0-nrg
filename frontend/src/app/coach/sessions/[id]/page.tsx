"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, Lock, UserPlus, X } from "@phosphor-icons/react";
import { Button, Card, EmptyState, ErrorNote, ListSkeleton, MarkBadge, PageHeader, StatusBadge, cx, LinkButton } from "@/components/ui";
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
      <Link href="/coach/sessions" className="motion-base mb-4 inline-flex items-center gap-2 rounded-lg px-1 py-1 caption-1 text-muted hover:text-white">
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
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2 text-muted">
              <Lock size={20} aria-hidden className="shrink-0" />
              <p className="body-5">This session is closed. Marks are locked and cannot be changed.</p>
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
              body="Add players for this sport first. Players added later do not join a session that is already open."
              action={<LinkButton href="/coach/players">Add a player</LinkButton>}
            />
          ) : (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
                <p className="body-5 text-muted">
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
                    <p className="title-3 min-w-0 truncate">{a.playerName}</p>
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
                                on && m === "present" && "!border-emerald-300/40 !bg-emerald-300/15 !text-ok",
                                on && m === "absent" && "!border-rose-300/40 !bg-rose-300/15 !text-bad"
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
                <p className="caption-2 text-muted">
                  Mark every player before closing. Still to mark: {unmarked.map((a) => a.playerName).join(", ")}.
                </p>
              )}
              {confirming ? (
                <div role="alertdialog" aria-label="Confirm closing" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
                  <p className="body-5">Close this session? It will be locked, and the marks count towards attendance for good.</p>
                  <div className="flex gap-2">
                    <Button busy={closing} onClick={close}>
                      <Lock size={20} aria-hidden />
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
                    <Lock size={20} aria-hidden />
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
