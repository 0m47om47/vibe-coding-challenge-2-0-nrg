"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { ChalkboardTeacher, Eye, EyeSlash, ShieldCheck, User } from "@phosphor-icons/react";
import { useAuth } from "@/components/AuthProvider";
import { SportPicker } from "@/components/SportPicker";
import { Button, Card, ErrorNote, Field, cx, inputClass } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { homeFor } from "@/lib/format";
import type { Sport } from "@/types";

type Tab = "signin" | "signup";
const PATH: Record<Tab, string> = { signin: "/login", signup: "/register-academy" };

// One-click sign-in with the seeded Dumka Sports Academy accounts (AGENTS.md §9). Shown in demo mode and in the
// deployment, so anyone judging the app can try each role. Remove before real use: these accounts are public.
const QUICK_ACCOUNTS = [
  { role: "Coach", note: "Run sessions and matches", username: "coach", password: "coach123", icon: ChalkboardTeacher },
  { role: "Player", note: "Dev, Cricket", username: "dev", password: "dev123", icon: User },
  { role: "Scout", note: "See who is Ready", username: "scout", password: "scout123", icon: ShieldCheck },
];

/** The card on /login and /register-academy: Sign in and Sign up tabs over one card. Each tab keeps its own URL. */
export function AuthTabs({ initial }: { initial: Tab }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initial);

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user.role));
  }, [loading, user, router]);

  function choose(next: Tab) {
    setTab(next);
    // Keep the address in step with the tab, so a refresh or a shared link opens the same tab.
    window.history.replaceState(null, "", PATH[next]);
  }

  // Left and right arrow keys move between the two tabs, as in any tab list.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = tab === "signin" ? "signup" : "signin";
    choose(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  const tabButton = (id: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={tab === id}
      aria-controls={`panel-${id}`}
      tabIndex={tab === id ? 0 : -1}
      onClick={() => choose(id)}
      className={cx(
        "motion-base flex-1 cursor-pointer rounded-lg px-4 py-2 button-md",
        tab === id ? "bg-surface text-ink shadow-[0_1px_2px_0_rgb(15_23_42/0.08)]" : "text-muted hover:text-ink"
      )}
    >
      {label}
    </button>
  );

  return (
    <Card className={cx("w-full p-2", tab === "signup" ? "max-w-xl" : "max-w-md")}>
      <div role="tablist" aria-label="Sign in or sign up" onKeyDown={onKeyDown} className="flex gap-1 rounded-xl bg-raised p-1">
        {tabButton("signin", "Sign in")}
        {tabButton("signup", "Sign up")}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="p-4 sm:p-6">
        {tab === "signin" ? <SignInForm /> : <SignUpForm />}
      </div>
    </Card>
  );
}

function SignInForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function performLogin(u: string, p: string) {
    setError(null);
    if (!u.trim()) return setError("Enter your username or email.");
    if (!p) return setError("Enter your password.");
    setBusy(true);
    try {
      const res = await login(u.trim(), p);
      router.replace(homeFor(res.role));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="heading-5 text-ink">Welcome back</h1>
        <p className="body-5 text-ink-2">Sign in to your academy</p>
      </div>

      <section aria-labelledby="quick-title" className="rounded-2xl border border-primary/30 bg-hover p-4">
        <h2 id="quick-title" className="title-4 text-ink">
          Try it in one click
        </h2>
        <p className="caption-5 mb-3 text-ink-2">Sign in to Dumka Sports Academy as</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACCOUNTS.map((a) => (
            <button
              key={a.username}
              type="button"
              disabled={busy}
              onClick={() => {
                setUsername(a.username);
                setPassword(a.password);
                performLogin(a.username, a.password);
              }}
              aria-label={`Sign in as ${a.role.toLowerCase()}`}
              className="motion-base flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-line bg-surface px-2 py-3 text-center hover:border-primary active:scale-[0.98] disabled:opacity-50"
            >
              <a.icon size={20} aria-hidden className="text-accent-ink" />
              <span className="title-4 text-ink">{a.role}</span>
              <span className="caption-5 text-muted">{a.note}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 caption-4 text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        or with your own account
        <span className="h-px flex-1 bg-line" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          performLogin(username, password);
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        <Field label="Username or email" hint="Scouts sign in with their email">
          <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />
        </Field>
        <PasswordField label="Password" value={password} onChange={setPassword} show={show} onToggle={() => setShow((s) => !s)} autoComplete="current-password" />
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button variant="action" type="submit" busy={busy}>
          {busy ? "Signing in" : "Sign in"}
        </Button>
      </form>

      <p className="border-t border-line pt-4 body-5 text-ink-2">
        Are you a scout?{" "}
        <Link href="/register" className="font-semibold text-link underline underline-offset-2 hover:text-ink">
          Request access with your email
        </Link>
      </p>
    </div>
  );
}

function SignUpForm() {
  const { registerAcademy } = useAuth();
  const router = useRouter();
  const [academyName, setAcademyName] = useState("");
  const [town, setTown] = useState("");
  const [sports, setSports] = useState<Sport[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = academyName.trim();
    const login = username.trim().toLowerCase();
    if (name.length < 3) return setError("Enter the academy's name, at least 3 characters.");
    if (sports.length === 0) return setError("Choose at least one sport the academy runs.");
    if (login.length < 3 || !/^[a-z0-9_.-]+$/.test(login)) {
      return setError("Coach username needs at least 3 characters: letters, numbers, dot, dash or underscore.");
    }
    if (password.length < 6) return setError("Password needs at least 6 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      const u = await registerAcademy({ academyName: name, town: town.trim() || undefined, sports, username: login, password });
      router.replace(homeFor(u.role));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="heading-5 text-ink">Register your academy</h1>
        <p className="body-5 text-ink-2">Set up the academy and its first coach. Add players, scouts and more coaches once you are in.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <section aria-labelledby="academy-part" className="flex flex-col gap-4">
          <h2 id="academy-part" className="title-3 text-ink">
            Academy
          </h2>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Academy name">
              <input className={inputClass} value={academyName} onChange={(e) => setAcademyName(e.target.value)} autoComplete="organization" autoFocus />
            </Field>
            <Field label="Town" hint="Optional">
              <input className={inputClass} value={town} onChange={(e) => setTown(e.target.value)} autoComplete="address-level2" />
            </Field>
          </div>
          <SportPicker value={sports} onChange={setSports} legend="Sports the academy runs" hint="You can change these later in Academy settings" />
        </section>

        <section aria-labelledby="coach-part" className="flex flex-col gap-4 border-t border-line pt-6">
          <h2 id="coach-part" className="title-3 text-ink">
            Coach account
          </h2>
          <Field label="Coach username" hint="Letters, numbers, dot, dash or underscore">
            <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField label="Password" hint="At least 6 characters" value={password} onChange={setPassword} show={show} onToggle={() => setShow((s) => !s)} autoComplete="new-password" />
            <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} show={show} autoComplete="new-password" />
          </div>
        </section>

        {error && <ErrorNote>{error}</ErrorNote>}
        <Button variant="action" type="submit" busy={busy}>
          {busy ? "Creating academy" : "Create academy"}
        </Button>
      </form>
    </div>
  );
}

/** A password input with an optional show/hide button. The button sits outside the <label>, so the field's name stays "Password". */
function PasswordField({
  label,
  hint,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle?: () => void;
  autoComplete: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="caption-1 text-ink-2">
        {label}
      </label>
      <span className="relative block">
        <input
          id={id}
          className={cx(inputClass, onToggle && "pr-11")}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={show}
            aria-label="Show password"
            className="motion-base absolute right-1 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink"
          >
            {show ? <EyeSlash size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        )}
      </span>
      {hint && (
        <span id={`${id}-hint`} className="caption-5 text-muted">
          {hint}
        </span>
      )}
    </div>
  );
}
