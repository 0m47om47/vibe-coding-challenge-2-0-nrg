"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ReadyBadge, cx, inputClass } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import type { PlayerStats } from "@/types";

/**
 * Find a player by name and open their profile. Searches the same list the person may see
 * (the backend already limits a scout to Ready players), loaded the first time the box is used.
 */
export function PlayerSearch({ hrefFor }: { hrefFor: (id: string) => string }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [players, setPlayers] = useState<PlayerStats[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (players || loading) return;
    setLoading(true);
    setError(null);
    try {
      setPlayers((await api.players.list()).players);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const q = query.trim().toLowerCase();
  const matches = q ? (players ?? []).filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8) : [];
  const showList = open && q.length > 0;

  function go(p: PlayerStats) {
    setOpen(false);
    setQuery("");
    router.push(hrefFor(p.id));
  }

  return (
    <div className="relative w-full max-w-sm">
      <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        role="combobox"
        aria-label="Search players by name"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && matches[active] ? `${listId}-${matches[active].id}` : undefined}
        placeholder="Search players"
        autoComplete="off"
        className={cx(inputClass, "pl-10")}
        value={query}
        onFocus={() => {
          load();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(matches.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && matches[active]) {
            e.preventDefault();
            go(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching players"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-line bg-raised py-1"
        >
          {loading ? (
            <li className="px-3 py-2 body-5 text-ink-2">Loading players</li>
          ) : error ? (
            <li className="px-3 py-2 body-5 text-bad">{error}</li>
          ) : matches.length === 0 ? (
            <li className="px-3 py-2 body-5 text-ink-2">No player called &ldquo;{query.trim()}&rdquo;</li>
          ) : (
            matches.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(p)}
                className={cx("flex cursor-pointer items-center gap-3 px-3 py-2", i === active && "bg-hover")}
              >
                <PlayerAvatar player={p} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="body-4 block truncate text-ink">{p.name}</span>
                  <span className="caption-5 text-muted">{p.sport}</span>
                </span>
                <ReadyBadge ready={p.ready} />
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
