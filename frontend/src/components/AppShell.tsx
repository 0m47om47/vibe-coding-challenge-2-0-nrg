"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, Medal, SignOut, SoccerBall, Users, UserCircle } from "@phosphor-icons/react";
import { useAuth } from "@/components/AuthProvider";
import { cx } from "@/components/ui";
import type { Role } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const icon = { size: 20, "aria-hidden": true } as const;

const NAV: Record<Role, NavItem[]> = {
  coach: [
    { href: "/coach", label: "Ready board", icon: <Medal {...icon} />, exact: true },
    { href: "/coach/players", label: "Players", icon: <Users {...icon} /> },
    { href: "/coach/sessions", label: "Sessions", icon: <Calendar {...icon} /> },
    { href: "/coach/matches", label: "Matches", icon: <SoccerBall {...icon} /> },
  ],
  scout: [{ href: "/scout", label: "Ready players", icon: <Medal {...icon} />, exact: true }],
  player: [{ href: "/me", label: "My row", icon: <UserCircle {...icon} />, exact: true }],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = user ? NAV[user.role] : [];

  // Close the mobile menu after navigating, and lock page scroll while it is open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = (i: NavItem) => (i.exact ? pathname === i.href : pathname.startsWith(i.href));

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <>
      <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
        <nav
          aria-label="Main"
          className="flex w-full max-w-4xl items-center justify-between gap-4 rounded-2xl border border-line bg-surface/70 px-3 py-2 backdrop-blur-md md:w-auto"
        >
          <Link href={items[0]?.href ?? "/"} className="motion-base rounded-lg px-2 py-1 title-3 hover:bg-hover">
            Academy Desk
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={active(i) ? "page" : undefined}
                  className={cx(
                    "motion-base flex items-center gap-2 rounded-lg px-3 py-2 button-sm",
                    active(i) ? "bg-hover text-white" : "text-muted hover:bg-hover hover:text-white"
                  )}
                >
                  {i.icon}
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-3 md:flex">
            <span className="caption-4 text-muted">
              {user?.username} · {user?.role}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="motion-base flex items-center gap-2 rounded-lg px-3 py-2 button-sm text-muted hover:bg-hover hover:text-white active:scale-[0.98]"
            >
              <SignOut {...icon} />
              Log out
            </button>
          </div>

          <button
            type="button"
            className="motion-base relative size-10 rounded-lg hover:bg-hover md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span
              className={cx(
                "motion-slow motion-move absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-white",
                open ? "rotate-45" : "-translate-y-1"
              )}
            />
            <span
              className={cx(
                "motion-slow motion-move absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-white",
                open ? "-rotate-45" : "translate-y-1"
              )}
            />
          </button>
        </nav>
      </header>

      {/* Full height mobile menu. Links arrive one by one, 60ms apart, capped at 400ms. */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        inert={!open}
        className={cx(
          "motion-slow fixed inset-0 z-30 bg-canvas/95 px-4 pt-24 backdrop-blur-xl md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <ul className="flex flex-col gap-2">
          {items.map((i, n) => (
            <li
              key={i.href}
              className={cx("motion-slow motion-move", open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}
              style={{ transitionDelay: open ? `${Math.min(n * 60, 400)}ms` : "0ms" }}
            >
              <Link
                href={i.href}
                aria-current={active(i) ? "page" : undefined}
                className={cx(
                  "motion-base flex items-center gap-3 rounded-2xl border px-4 py-4 title-2",
                  active(i) ? "border-line bg-surface text-white" : "border-transparent text-muted hover:bg-hover hover:text-white"
                )}
              >
                {i.icon}
                {i.label}
              </Link>
            </li>
          ))}
          <li
            className={cx("motion-slow motion-move mt-4", open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}
            style={{ transitionDelay: open ? `${Math.min(items.length * 60, 400)}ms` : "0ms" }}
          >
            <p className="caption-4 mb-2 px-4 text-muted">
              Signed in as {user?.username} ({user?.role})
            </p>
            <button
              type="button"
              onClick={onLogout}
              className="motion-base flex w-full items-center gap-3 rounded-2xl border border-line px-4 py-4 title-2 text-white hover:bg-hover active:scale-[0.98]"
            >
              <SignOut {...icon} />
              Log out
            </button>
          </li>
        </ul>
      </div>

      <main id="main" className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24">
        {children}
      </main>
    </>
  );
}
