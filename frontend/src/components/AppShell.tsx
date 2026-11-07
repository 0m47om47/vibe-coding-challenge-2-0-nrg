"use client";

import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, GearSix, IdentificationCard, Medal, SignOut, SoccerBall, Users, UserCircle } from "@phosphor-icons/react";
import { useAuth } from "@/components/AuthProvider";
import { SportBar } from "@/components/SportFilter";
import { PlayerSearch } from "@/components/PlayerSearch";
import { cx } from "@/components/ui";
import { profileHref } from "@/lib/format";
import type { Role } from "@/types";


interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const icon = { size: 18, "aria-hidden": true } as const;

const NAV: Record<Role, NavItem[]> = {
  coach: [
    { href: "/coach", label: "Ready board", icon: <Medal {...icon} />, exact: true },
    { href: "/coach/players", label: "Players", icon: <Users {...icon} /> },
    { href: "/coach/sessions", label: "Sessions", icon: <Calendar {...icon} /> },
    { href: "/coach/matches", label: "Matches", icon: <SoccerBall {...icon} /> },
    { href: "/coach/profiles", label: "Profiles", icon: <IdentificationCard {...icon} /> },
  ],
  scout: [{ href: "/scout", label: "Ready players", icon: <Medal {...icon} /> }],
  player: [{ href: "/me", label: "My profile", icon: <UserCircle {...icon} />, exact: true }],
};

// Pages whose lists follow the sport bar. Profiles, settings and single-record pages do not show it.
const FILTERED_PAGES = new Set(["/coach", "/coach/players", "/coach/sessions", "/coach/matches", "/coach/profiles", "/scout"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = user ? NAV[user.role] : [];
  // "coach (coach)" reads as a glitch, so the role is only added when it says something new.
  const who = user ? (user.username === user.role ? user.username : `${user.username} (${user.role})`) : "";
  const searchHref = user && user.role !== "player" ? (id: string) => profileHref(user.role, id) : null;

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

  const navLinks = (big: boolean) =>
    items.map((i, n) => (
      <li
        key={i.href}
        className={big ? cx("motion-slow motion-move", open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0") : undefined}
        style={big ? { transitionDelay: open ? `${Math.min(n * 60, 400)}ms` : "0ms" } : undefined}
      >
        <Link
          href={i.href}
          aria-current={active(i) ? "page" : undefined}
          className={cx(
            "motion-base flex items-center gap-3 rounded-lg",
            big ? "px-4 py-4 title-2" : "px-3 py-2 button-sm",
            active(i) ? "bg-on-dark/10 text-on-dark" : "text-on-dark/80 hover:bg-on-dark/10 hover:text-on-dark"
          )}
        >
          {i.icon}
          {i.label}
        </Link>
      </li>
    ));

  // Coaches only: the academy's name, town and sports.
  const settingsLink = (big: boolean) =>
    user?.role === "coach" ? (
      <Link
        href="/coach/academy"
        aria-current={pathname === "/coach/academy" ? "page" : undefined}
        className={cx(
          "motion-base flex items-center gap-3 rounded-lg",
          big ? "px-4 py-4 title-2" : "px-3 py-2 button-sm",
          pathname === "/coach/academy" ? "bg-on-dark/10 text-on-dark" : "text-on-dark/80 hover:bg-on-dark/10 hover:text-on-dark"
        )}
      >
        <GearSix {...icon} />
        Academy settings
      </Link>
    ) : null;

  const logoutButton = (big: boolean) => (
    <button
      type="button"
      onClick={onLogout}
      className={cx(
        "motion-base flex w-full cursor-pointer items-center gap-3 rounded-lg text-on-dark/80 hover:bg-on-dark/10 hover:text-on-dark active:scale-[0.98]",
        big ? "border border-on-dark/25 px-4 py-4 title-2" : "px-3 py-2 button-sm"
      )}
    >
      <SignOut {...icon} />
      Log out
    </button>
  );

  return (
    <>
      {/* Desktop: fixed left sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-on-dark/10 bg-dark-deep md:flex">
        <Link href={items[0]?.href ?? "/"} className="flex items-center gap-3 px-6 py-6">
          <BrandMark size={52} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="heading-6 text-on-dark">Academy Desk</span>
            {user && <span className="caption-4 truncate text-on-dark/70">{user.academy.name}</span>}
          </span>
        </Link>
        <nav aria-label="Main" className="flex-1 px-3">
          <ul className="flex flex-col gap-1">{navLinks(false)}</ul>
        </nav>
        <div className="border-t border-on-dark/15 p-3">
          {settingsLink(false)}
          <p className="caption-4 mb-2 mt-2 truncate px-3 text-on-dark/70">Signed in as {who}</p>
          {logoutButton(false)}
        </div>
      </aside>

      {/* Phones: top bar and a full height menu */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-on-dark/10 bg-dark-deep px-4 py-2 md:hidden">
        <Link href={items[0]?.href ?? "/"} className="flex min-w-0 items-center gap-2 heading-6 text-on-dark">
          <BrandMark size={40} />
          <span className="truncate">{user?.academy.name ?? "Academy Desk"}</span>
        </Link>
        <button
          type="button"
          className="motion-base relative size-10 cursor-pointer rounded-lg hover:bg-on-dark/10"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className={cx(
              "motion-slow motion-move absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 rounded-sm bg-on-dark",
              open ? "rotate-45" : "-translate-y-1"
            )}
          />
          <span
            className={cx(
              "motion-slow motion-move absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 rounded-sm bg-on-dark",
              open ? "-rotate-45" : "translate-y-1"
            )}
          />
        </button>
      </header>
      <div
        id="mobile-menu"
        aria-hidden={!open}
        inert={!open}
        className={cx(
          "motion-slow fixed inset-x-0 bottom-0 top-14 z-30 bg-dark-deep px-4 pt-4 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <nav aria-label="Main">
          <ul className="flex flex-col gap-2">{navLinks(true)}</ul>
        </nav>
        <div
          className={cx("motion-slow motion-move mt-6", open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}
          style={{ transitionDelay: open ? `${Math.min(items.length * 60, 400)}ms` : "0ms" }}
        >
          {settingsLink(true)}
          <p className="caption-4 mb-2 mt-2 px-4 text-on-dark/70">Signed in as {who}</p>
          {logoutButton(true)}
        </div>
      </div>

      <div className="md:pl-60">
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 md:px-8 md:pt-8">
          {searchHref && (
            <div className="mb-4 max-w-xl">
              <PlayerSearch hrefFor={searchHref} />
            </div>
          )}
          {FILTERED_PAGES.has(pathname) && <SportBar />}
          {children}
        </main>
      </div>
    </>
  );
}
