import Link from "next/link";
import { CheckCircle, Lock, LockOpen, Warning, XCircle, Trophy } from "@phosphor-icons/react";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/* ---------- Buttons ---------- */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  const base =
    "motion-base inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";
  const text = size === "md" ? "button-md" : "button-sm";
  const tone = {
    primary: "bg-white text-black hover:bg-white/85",
    secondary: "border border-line bg-raised text-white hover:bg-hover",
    ghost: "text-muted hover:bg-hover hover:text-white",
    danger: "border border-rose-300/30 bg-rose-300/10 text-bad hover:bg-rose-300/20",
  }[variant];
  return cx(base, text, tone, extra);
}

export function Button({
  variant,
  size,
  className,
  busy,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; busy?: boolean }) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={props.disabled || busy}
      aria-busy={busy || undefined}
      className={buttonClass(variant, size, className)}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant,
  size,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ---------- Form fields ---------- */
export const inputClass =
  "motion-base w-full rounded-lg border border-line bg-raised px-3 py-2 body-3 text-white placeholder:text-muted hover:border-muted focus-visible:border-white disabled:opacity-40";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("flex flex-col gap-1", className)}>
      <span className="caption-1">{label}</span>
      {children}
      {hint && <span className="caption-5 text-muted">{hint}</span>}
    </label>
  );
}

/* ---------- Surfaces ---------- */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cx("rounded-2xl border border-line bg-surface", className)}>{children}</section>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="heading-5 md:heading-4">{title}</h1>
        {subtitle && <p className="body-6 max-w-[680px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/* ---------- Badges ---------- */
type Tone = "ready" | "neutral" | "open" | "present" | "absent";

const toneClass: Record<Tone, string> = {
  ready: "border-emerald-300/30 bg-emerald-300/10 text-ok",
  present: "border-emerald-300/30 bg-emerald-300/10 text-ok",
  absent: "border-rose-300/30 bg-rose-300/10 text-bad",
  open: "border-amber-300/30 bg-amber-300/10 text-warn",
  neutral: "border-line bg-raised text-muted",
};

export function Badge({ tone = "neutral", icon, children }: { tone?: Tone; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 caption-3", toneClass[tone])}>
      {icon}
      {children}
    </span>
  );
}

export const ReadyBadge = ({ ready }: { ready: boolean }) =>
  ready ? (
    <Badge tone="ready" icon={<Trophy size={14} weight="fill" aria-hidden />}>
      Ready
    </Badge>
  ) : (
    <Badge>Not ready</Badge>
  );

export const MarkBadge = ({ mark }: { mark: "present" | "absent" | null }) =>
  mark === "present" ? (
    <Badge tone="present" icon={<CheckCircle size={14} weight="fill" aria-hidden />}>
      Present
    </Badge>
  ) : mark === "absent" ? (
    <Badge tone="absent" icon={<XCircle size={14} weight="fill" aria-hidden />}>
      Absent
    </Badge>
  ) : (
    <Badge>Not marked</Badge>
  );

export const StatusBadge = ({ status }: { status: "open" | "closed" }) =>
  status === "open" ? (
    <Badge tone="open" icon={<LockOpen size={14} aria-hidden />}>
      Open
    </Badge>
  ) : (
    <Badge icon={<Lock size={14} aria-hidden />}>Closed and locked</Badge>
  );

/* ---------- States: loading, empty, error ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-lg bg-hover", className)} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-12 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <h2 className="heading-6">{title}</h2>
      <p className="body-6 max-w-[680px] text-muted">{body}</p>
      {action}
    </div>
  );
}

export function ErrorNote({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-bad"
    >
      <Warning size={20} weight="fill" aria-hidden className="shrink-0" />
      <p className="body-5 min-w-0 flex-1 break-words">{children}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-ok">
      <CheckCircle size={20} weight="fill" aria-hidden className="shrink-0" />
      <p className="body-5">{children}</p>
    </div>
  );
}
