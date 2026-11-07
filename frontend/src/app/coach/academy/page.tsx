"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SportPicker } from "@/components/SportPicker";
import { Button, Card, ErrorNote, Field, Notice, PageHeader, inputClass } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import type { Sport } from "@/types";

// Coach only (the coach layout guards it). Name, town and the sports the academy runs.
export default function AcademySettingsPage() {
  const { user, refresh } = useAuth();
  const academy = user?.academy;
  const [name, setName] = useState("");
  const [town, setTown] = useState("");
  const [sports, setSports] = useState<Sport[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!academy) return;
    setName(academy.name);
    setTown(academy.town ?? "");
    setSports(academy.sports);
  }, [academy]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (name.trim().length < 3) return setError("The academy name needs at least 3 characters.");
    if (sports.length === 0) return setError("Choose at least one sport.");
    setBusy(true);
    try {
      await api.academy.update({ name: name.trim(), town: town.trim() || null, sports });
      await refresh(); // menus and the sport selector follow the new list straight away
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!academy) return null;
  return (
    <>
      <PageHeader title="Academy settings" subtitle="The academy's name and the sports it runs. Every coach of the academy can change these." />
      <Card className="max-w-3xl p-6">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Academy name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="organization" />
            </Field>
            <Field label="Town" hint="Optional">
              <input className={inputClass} value={town} onChange={(e) => setTown(e.target.value)} autoComplete="address-level2" />
            </Field>
          </div>
          <SportPicker
            value={sports}
            onChange={setSports}
            legend="Sports the academy runs"
            hint="A sport that still has players cannot be removed"
          />
          {error && <ErrorNote>{error}</ErrorNote>}
          {saved && <Notice>Academy settings saved.</Notice>}
          <div>
            <Button variant="action" type="submit" busy={busy}>
              {busy ? "Saving" : "Save settings"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
