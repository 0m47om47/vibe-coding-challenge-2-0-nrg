"use client";

import { RadarChart } from "@/components/RadarChart";
import { radarAxes, rating, streaks, type Axis } from "@/lib/rating";
import { MatchStatsChart } from "@/components/MatchStatsChart";
import { SPORT_STATS, statText, totalStats } from "@/lib/sportStats";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, Circle, PencilSimple } from "@phosphor-icons/react";
import { AttendanceTrend } from "@/components/AttendanceTrend";
import { useAuth } from "@/components/AuthProvider";
import { PlayerPhoto } from "@/components/PlayerAvatar";
import { ProfileEditor } from "@/components/ProfileEditor";
import { Button, Card, EmptyState, ErrorNote, ListSkeleton, MarkBadge, ReadyBadge, SportTag } from "@/components/ui";
import { api } from "@/lib/api";
import { canEditProfile, formatDate, pctLabel, readyGaps } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import type { PlayerHistory, PlayerStats } from "@/types";

function Panel({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <Card className={`p-4 sm:p-6 ${className ?? ""}`}>
      <h2 className="title-3 mb-4 text-ink">{title}</h2>
      {children}
    </Card>
  );
}

/** A player's full profile page. Everything shown comes from the API; nothing is estimated or invented. */
export function PlayerProfile({ playerId, back }: { playerId: string; back?: { href: string; label: string } }) {
  const { user } = useAuth();
  const { data, setData, error, loading, reload } = useLoad(async () => {
    const [{ player }, { history }] = await Promise.all([api.players.get(playerId), api.players.history(playerId)]);
    return { player, history };
  }, [playerId]);
  const [editing, setEditing] = useState(false);
  // /coach/players/<id>?edit=1 (from Profile management) opens the editor right away.
  useEffect(() => setEditing(new URLSearchParams(window.location.search).get("edit") === "1"), [playerId]);

  const backLink = back && (
    <Link
      href={back.href}
      className="motion-base mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1 caption-1 text-ink-2 hover:bg-hover hover:text-ink"
    >
      <ArrowLeft size={16} aria-hidden />
      {back.label}
    </Link>
  );

  if (loading) return <>{backLink}<ListSkeleton rows={4} /></>;
  if (error || !data) return <>{backLink}<ErrorNote onRetry={reload}>{error ?? "Player not found."}</ErrorNote></>;

  const { player, history } = data;
  const canEdit = canEditProfile(user, player.id);
  const axes = radarAxes(player, history);
  const run = streaks(history.sessions);
  const onUpdated = (p: PlayerStats) => setData({ player: p, history });

  return (
    <>
      {backLink}
      <div className="flex flex-col gap-4">
        <ProfileHeader player={player} canEdit={canEdit} editing={editing} onToggleEdit={() => setEditing((e) => !e)} />

        {editing && canEdit && <ProfileEditor player={player} onUpdated={onUpdated} onDone={() => setEditing(false)} />}

        <StatsStrip player={player} history={history} axes={axes} />

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Performance">
            <RadarChart axes={axes} />
            <p className="caption-5 mt-2 text-center text-muted">
              Rating is the average of these axes. Each axis is 0 to 100, measured against the academy&apos;s best in {player.sport}.
            </p>
          </Panel>
          <Panel title="Attendance">
            <DetailList
              rows={[
                ["Sessions held", String(player.sessionsHeld)],
                ["Present", String(player.sessionsPresent)],
                ["Absent", String(player.sessionsHeld - player.sessionsPresent)],
                ["Current streak", `${run.current} in a row`],
                ["Best streak", `${run.best} in a row`],
              ]}
            />
          </Panel>
          <Panel title={player.sport}>
            <DetailList
              rows={[
                ...totalStats(player.sport, history.matches.map((m) => m.stats)).flatMap(({ field, average }) => {
                  const best = Math.max(0, ...history.matches.map((m) => m.stats[field.key] ?? 0));
                  return [
                    [`${field.label}, per match`, String(average)],
                    [`${field.label}, best match`, String(best)],
                  ] as [string, string][];
                }),
              ]}
            />
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Panel title="Attendance over time">
            <AttendanceTrend sessions={history.sessions} />
          </Panel>
          <Panel title="Trial status">
            <TrialStatus player={player} />
          </Panel>
        </div>

        {history.matches.length > 0 && (
          <Panel title="Match by match">
            <MatchStatsChart sport={player.sport} matches={history.matches} />
          </Panel>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Recent matches">
            {history.matches.length === 0 ? (
              <p className="body-5 text-muted">No matches yet. A player goes on a score sheet when they were present at that day&apos;s session.</p>
            ) : (
              <ul>
                {history.matches.slice(0, 6).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
                    <div className="min-w-0">
                      <p className="body-4 truncate text-ink">Against {m.opponent}</p>
                      <p className="caption-5 text-muted">{formatDate(m.date)}</p>
                    </div>
                    <p className="shrink-0 text-right body-5 text-ink">
                      {SPORT_STATS[player.sport].map((f) => statText(f, m.stats[f.key] ?? 0)).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Session history">
            {history.sessions.length === 0 ? (
              <p className="body-5 text-muted">No closed sessions yet.</p>
            ) : (
              <ul aria-label="Closed sessions, newest first">
                {[...history.sessions].reverse().slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
                    <div className="min-w-0">
                      <p className="body-4 text-ink">{formatDate(s.date)}</p>
                      <p className="caption-5 text-muted">{s.sport}</p>
                    </div>
                    <MarkBadge mark={s.mark} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function ProfileHeader({
  player,
  canEdit,
  editing,
  onToggleEdit,
}: {
  player: PlayerStats;
  canEdit: boolean;
  editing: boolean;
  onToggleEdit: () => void;
}) {
  const body: [string, string, string][] = [
    ["Age", String(player.age), ""],
    ["Height", player.heightCm ? String(player.heightCm) : "Not set", player.heightCm ? "cm" : ""],
    ["Weight", player.weightKg ? String(player.weightKg) : "Not set", player.weightKg ? "kg" : ""],
  ];
  return (
    <Card className="flex flex-wrap items-center justify-between gap-6 !border-dark !bg-dark p-4 sm:p-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-full border border-line bg-raised">
          <PlayerPhoto player={player} width={160} height={160} priority />
        </div>
        <div className="min-w-0">
          <h1 className="heading-5 sm:heading-4 break-words text-on-dark">{player.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 body-5 text-on-dark/80">
            <SportTag sport={player.sport} onDark />
            {player.nationality && <span>{player.nationality}</span>}
            <ReadyBadge ready={player.ready} />
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <dl className="flex gap-6">
          {body.map(([label, value, unit]) => (
            <div key={label} className="flex flex-col-reverse text-center">
              <dt className="caption-4 text-on-dark/70">{label}</dt>
              <dd className="heading-5 font-mono text-on-dark">
                {value}
                {unit && <span className="body-5 ml-1 text-on-dark/70">{unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
        {canEdit && (
          <Button size="sm" variant="secondary" aria-expanded={editing} onClick={onToggleEdit}>
            <PencilSimple size={16} aria-hidden />
            {editing ? "Close editor" : "Edit profile"}
          </Button>
        )}
      </div>
    </Card>
  );
}

function StatsStrip({ player, history, axes }: { player: PlayerStats; history: PlayerHistory; axes: Axis[] }) {
  const tiles: [string, string][] = [
    ["Rating", String(rating(axes))],
    ["Matches played", String(player.matchesPlayed)],
    ["Attendance", pctLabel(player.attendancePct)],
    ...totalStats(player.sport, history.matches.map((m) => m.stats)).map(({ field, total }): [string, string] => [field.label, String(total)]),
  ];
  return (
    <Card className="!border-dark !bg-dark p-4 sm:p-6">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
        {tiles.map(([label, value], i) => (
          <div key={label} className="flex flex-col-reverse">
            <dt className="caption-4 text-on-dark/70">{label}</dt>
            <dd className={i === 0 ? "heading-4 font-mono font-bold text-primary-soft" : "heading-4 font-mono font-bold text-on-dark"}>{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function DetailList({ rows }: { rows: [string, string][] }) {
  return (
    <dl>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-3 border-t border-line py-2 first:border-t-0 first:pt-0">
          <dt className="body-5 text-ink-2">{label}</dt>
          <dd className="body-4 font-mono text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TrialStatus({ player }: { player: PlayerStats }) {
  const checks: [string, string, boolean][] = [
    ["Attendance of 75% or more", pctLabel(player.attendancePct), player.sessionsHeld > 0 && player.attendancePct >= 75],
    ["At least 2 matches", String(player.matchesPlayed), player.matchesPlayed >= 2],
  ];
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {checks.map(([label, value, met]) => (
          <li key={label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 body-5 text-ink-2">
              {met ? (
                <CheckCircle size={18} weight="fill" className="shrink-0 text-accent-ink" aria-label="Met" />
              ) : (
                <Circle size={18} className="shrink-0 text-muted" aria-label="Not met yet" />
              )}
              {label}
            </span>
            <span className="body-4 text-ink">{value}</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-line pt-4">
        {player.ready ? (
          <p className="body-5 text-accent-ink">Ready for a trial. Scouts can see this profile.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {readyGaps(player).map((g) => (
              <li key={g} className="body-5 text-ink-2">
                {g}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function PlayerProfileEmpty() {
  return (
    <EmptyState title="No player record found" body="Your login is not linked to a player record yet. Ask your coach to check your account." />
  );
}
