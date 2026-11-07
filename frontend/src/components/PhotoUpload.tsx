"use client";

import { useRef, useState } from "react";
import { Camera, Trash } from "@phosphor-icons/react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { uploadPlayerPhoto } from "@/lib/photo";
import type { PlayerStats } from "@/types";

/** Add, change or remove one player's photo. Saves straight away and returns the updated player. */
export function PhotoUpload({
  player,
  onUpdated,
}: {
  player: PlayerStats;
  onUpdated: (p: PlayerStats) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again
    if (!file) return;
    setError(null);
    setBusy("upload");
    try {
      onUpdated(await uploadPlayerPhoto(player.id, file));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setError(null);
    setBusy("remove");
    try {
      onUpdated((await api.players.update(player.id, { photoUrl: null })).player);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label={`Choose a photo for ${player.name}`}
        onChange={onFile}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" busy={busy === "upload"} disabled={busy === "remove"} onClick={() => input.current?.click()}>
          <Camera size={16} aria-hidden />
          {busy === "upload" ? "Uploading photo" : player.photoUrl ? "Change photo" : "Add photo"}
        </Button>
        {player.photoUrl && (
          <Button variant="ghost" size="sm" busy={busy === "remove"} disabled={busy === "upload"} onClick={remove}>
            <Trash size={16} aria-hidden />
            {busy === "remove" ? "Removing" : "Remove photo"}
          </Button>
        )}
      </div>
      <p className="caption-5 text-muted">JPG, PNG or WebP. A clear photo of the face and shoulders works best.</p>
      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}
