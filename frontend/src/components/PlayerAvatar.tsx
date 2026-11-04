"use client";

import { useState } from "react";
import { cx } from "@/components/ui";
import { photoSrc } from "@/lib/photo";
import type { Player } from "@/types";

/** Shown while a player has no photo, and if the photo fails to load. */
export function Silhouette({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="No photo yet"
      className={cx(
        "flex size-full items-end justify-center overflow-hidden bg-raised",
        className
      )}
    >
      <svg viewBox="0 0 100 120" className="h-[82%] w-auto text-accent/40" aria-hidden>
        <circle cx="50" cy="38" r="20" fill="currentColor" />
        <path d="M8 120c0-27 18-44 42-44s42 17 42 44z" fill="currentColor" />
      </svg>
    </div>
  );
}

/** Fills its parent with the player's photo. `width` and `height` pick the size Cloudinary delivers. */
export function PlayerPhoto({
  player,
  width,
  height,
  className,
  priority,
}: {
  player: Pick<Player, "name" | "photoUrl">;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = photoSrc(player.photoUrl, width, height);
  if (!src || failed === src) return <Silhouette className={className} />;
  return (
    // Plain img: photos come from Cloudinary or the browser, already sized by Cloudinary.
    <img
      src={src}
      alt={`Photo of ${player.name}`}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(src)}
      className={cx("size-full object-cover object-top", className)}
    />
  );
}

const SIZES = {
  sm: { box: "size-10 rounded-lg", px: 80 },
  md: { box: "size-14 rounded-lg", px: 112 },
  lg: { box: "size-24 rounded-xl", px: 192 },
} as const;

/** Small square photo for rows and lists. */
export function PlayerAvatar({
  player,
  size = "sm",
  className,
}: {
  player: Pick<Player, "name" | "photoUrl">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div className={cx("shrink-0 overflow-hidden border border-line bg-raised", s.box, className)}>
      <PlayerPhoto player={player} width={s.px} height={s.px} />
    </div>
  );
}
