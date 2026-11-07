"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { PlayerPhoto } from "@/components/PlayerAvatar";
import { Button, ReadyBadge, SportTag, cx } from "@/components/ui";
import { splitName } from "@/lib/format";
import type { PlayerStats } from "@/types";

/**
 * Swipeable row of photo cards. The card nearest the middle grows and its name is shown large below,
 * like the reference design. Cards open the full profile.
 */
export function SquadCarousel({
  players,
  onSelect,
}: {
  players: PlayerStats[];
  onSelect: (p: PlayerStats) => void;
}) {
  const scroller = useRef<HTMLUListElement>(null);
  const frame = useRef(0);
  const [active, setActive] = useState(0);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const middle = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const distance = Math.abs(c.offsetLeft + c.offsetWidth / 2 - middle);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    setActive(best);
  }, []);

  // Scroll events are batched to one measurement per frame.
  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
  };

  useEffect(() => {
    measure();
    return () => cancelAnimationFrame(frame.current);
  }, [players, measure]);

  function go(index: number) {
    const el = scroller.current;
    const card = el?.children[Math.max(0, Math.min(players.length - 1, index))] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2, behavior: "smooth" });
  }

  const current = players[Math.min(active, players.length - 1)];
  const { first, last } = splitName(current.name);

  return (
    <section aria-roledescription="carousel" aria-label="Squad" className="relative">
      <div className="relative">
        <ul
          ref={scroller}
          onScroll={onScroll}
          tabIndex={0}
          aria-label="Players. Use the left and right arrow keys to move."
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              go(active + 1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              go(active - 1);
            }
          }}
          className="relative flex snap-x snap-mandatory items-center gap-4 overflow-x-auto px-[calc(50%-5.5rem)] py-8 [scrollbar-width:none] sm:px-[calc(50%-6.5rem)] [&::-webkit-scrollbar]:hidden"
        >
          {players.map((p, i) => {
            const on = i === active;
            return (
              <li key={p.id} className="w-44 shrink-0 snap-center sm:w-52">
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  aria-label={`Open profile of ${p.name}${p.ready ? ", ready for trial" : ""}`}
                  className={cx(
                    "motion-slow motion-move relative block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-xl border bg-surface",
                    on
                      ? "scale-105 border-primary opacity-100"
                      : "scale-90 border-line opacity-70 hover:opacity-100"
                  )}
                >
                  <PlayerPhoto player={p} width={480} height={640} priority={i < 3} />
                  <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-canvas via-canvas/60 to-transparent" />
                  <span
                    aria-hidden
                    className={cx(
                      "absolute right-3 top-3 flex size-12 items-center justify-center rounded-full bg-primary title-4 text-on-primary",
                      p.ready && "ring-2 ring-highlight-ink"
                    )}
                  >
                    {Math.round(p.attendancePct)}%
                  </span>
                  <span className="absolute inset-x-0 bottom-0 truncate px-3 pb-3 text-center title-4 text-ink">{p.name}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {players.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(active - 1)}
              disabled={active === 0}
              aria-label="Previous player"
              className="motion-base absolute left-0 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border border-line bg-raised text-ink hover:bg-hover active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <CaretLeft size={18} weight="bold" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              disabled={active === players.length - 1}
              aria-label="Next player"
              className="motion-base absolute right-0 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border border-line bg-raised text-ink hover:bg-hover active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <CaretRight size={18} weight="bold" aria-hidden />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <div>
          <p className="body-5 text-ink-2">{first || current.sport}</p>
          <p className="heading-3 md:heading-2 max-w-full break-words text-ink">{last}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <SportTag sport={current.sport} />
          {current.nationality && <span className="caption-4 text-ink-2">{current.nationality}</span>}
          <ReadyBadge ready={current.ready} />
        </div>
        <Button size="sm" onClick={() => onSelect(current)}>
          View profile
        </Button>
        <p className="caption-5 text-muted">
          {active + 1} of {players.length}
        </p>
      </div>
    </section>
  );
}
