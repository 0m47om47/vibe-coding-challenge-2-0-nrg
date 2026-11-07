"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarPlus, CaretRight } from "@phosphor-icons/react";
import { useAuth } from "@/components/AuthProvider";
import { useSportFilter } from "@/components/SportFilter";
import { SportSelect } from "@/components/SportSelect";
import { Button, Card, EmptyState, ErrorNote, Field, ListSkeleton, PageHeader, StatusBadge, inputClass } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, todayISO } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import type { Sport } from "@/types";

export default function SessionsPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useLoad(() => api.sessions.list());
  const [date, setDate] = useState(todayISO());
  const { user } = useAuth();
  const [sport, setSport] = useState<Sport>(user?.academy.sports[0] ?? "Football");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { sport: filter } = useSportFilter();
  useEffect(() => {
    if (filter) setSport(filter);
  }, [filter]);
  const sessions = (data?.sessions ?? []).filter((s) => !filter || s.sport === filter);

  async function onOpen(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!date) return setFormError("Pick a date for the session.");
    setBusy(true);
    try {
      const { session } = await api.sessions.open({ date, sport });
      router.push(`/coach/sessions/${session.id}`);
    } catch (err) {
      setFormError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Sessions"
        subtitle="Open a session, mark each player present or absent, then close it. Only closed sessions count toward readiness."
      />

      <Card className="mb-8 p-6">
        <h2 className="title-2 mb-4 text-ink">Open a session</h2>
        <form onSubmit={onOpen} noValidate className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Date">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Sport">
            <SportSelect value={sport} onChange={setSport} />
          </Field>
          <Button variant="action" type="submit" busy={busy}>
            <CalendarPlus size={18} aria-hidden />
            {busy ? "Opening" : "Open session"}
          </Button>
          {formError && (
            <div className="sm:col-span-3">
              <ErrorNote>{formError}</ErrorNote>
            </div>
          )}
        </form>
      </Card>

      <h2 className="title-2 mb-3 text-ink">All sessions</h2>
      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorNote onRetry={reload}>{error}</ErrorNote>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus size={32} aria-hidden />}
          title={filter ? `No ${filter} sessions yet` : "No sessions yet"}
          body="Open your first session above. Every player of that sport joins the roster."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => {
            const marked = s.attendance.filter((a) => a.mark).length;
            const total = s.attendance.length;
            return (
              <li key={s.id}>
                <Link
                  href={`/coach/sessions/${s.id}`}
                  className="motion-base flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 hover:bg-raised active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <p className="title-3 text-ink">{formatDate(s.date)}</p>
                    <p className="caption-5 text-muted">
                      {s.sport}, {total === 0 ? "no players on the roster" : `${marked} of ${total} marked`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={s.status} />
                    <CaretRight size={16} className="text-muted" aria-hidden />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
