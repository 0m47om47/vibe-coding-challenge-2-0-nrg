"use client";

import { useState } from "react";
import { FloppyDisk } from "@phosphor-icons/react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Button, ErrorNote, Field, inputClass } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import type { PlayerStats } from "@/types";

const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

/** Photo, height, weight and nationality. The photo saves as soon as it is uploaded; the rest on Save. */
export function ProfileEditor({
  player,
  onUpdated,
  onDone,
}: {
  player: PlayerStats;
  onUpdated: (p: PlayerStats) => void;
  onDone: () => void;
}) {
  const [height, setHeight] = useState(player.heightCm?.toString() ?? "");
  const [weight, setWeight] = useState(player.weightKg?.toString() ?? "");
  const [nationality, setNationality] = useState(player.nationality ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const h = height === "" ? null : Number(height);
    const w = weight === "" ? null : Number(weight);
    const n = nationality.trim() === "" ? null : nationality.trim();
    if (h !== null && (h < 50 || h > 250)) return setError("Height must be between 50 and 250 cm.");
    if (w !== null && (w < 10 || w > 250)) return setError("Weight must be between 10 and 250 kg.");
    if (n !== null && (n.length < 2 || n.length > 56)) return setError("Nationality must be 2 to 56 characters.");

    setBusy(true);
    try {
      const { player: saved } = await api.players.update(player.id, { heightCm: h, weightKg: w, nationality: n });
      onUpdated(saved);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={`Edit profile for ${player.name}`}
      className="rounded-xl border border-line bg-canvas/80 p-4 sm:p-6"
    >
      <h2 className="title-2 mb-4 text-ink">Edit profile</h2>

      <div className="mb-6 flex items-start gap-4">
        <PlayerAvatar player={player} size="lg" />
        <PhotoUpload player={player} onUpdated={onUpdated} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Height (cm)">
          <input className={inputClass} inputMode="numeric" value={height} onChange={(e) => setHeight(digits(e.target.value, 3))} autoComplete="off" />
        </Field>
        <Field label="Weight (kg)">
          <input className={inputClass} inputMode="numeric" value={weight} onChange={(e) => setWeight(digits(e.target.value, 3))} autoComplete="off" />
        </Field>
        <Field label="Nationality">
          <input className={inputClass} value={nationality} onChange={(e) => setNationality(e.target.value)} autoComplete="off" maxLength={56} />
        </Field>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="action" type="submit" busy={busy}>
          <FloppyDisk size={18} aria-hidden />
          {busy ? "Saving" : "Save profile"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={busy}>
          Close
        </Button>
      </div>
    </form>
  );
}
