import { CalendarCheck, Medal, ShieldCheck } from "@phosphor-icons/react";

const FEATURES = [
  { icon: CalendarCheck, label: "Attendance" },
  { icon: Medal, label: "Ready board" },
  { icon: ShieldCheck, label: "Scout access" },
];

/**
 * The frame of the sign-in, sign-up and scout pages: a dark panel that says what Academy Desk does on the left,
 * the form on the right. On phones the panel shrinks to the name above the form.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      <aside className="hidden flex-col justify-between bg-dark-deep px-12 py-12 text-on-dark lg:flex xl:px-20">
        <p className="heading-6 text-on-dark">Academy Desk</p>

        <div className="flex max-w-[560px] flex-col gap-6">
          <p className="heading-2 text-on-dark">Every session, match and trial in one desk</p>
          <p className="body-3 text-on-dark/80">
            Coaches mark who came and record each match. Players follow their own record. Scouts see who is ready for a trial, once a coach lets them in.
          </p>
          <ul className="flex flex-wrap gap-x-8 gap-y-4 border-t border-on-dark/15 pt-6">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 body-5 text-on-dark/90">
                <span className="flex size-9 items-center justify-center rounded-xl bg-on-dark/10 text-primary-soft">
                  <Icon size={18} aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="caption-5 text-on-dark/50">For sports academies, their coaches, players and scouts</p>
      </aside>

      <main id="main" className="flex flex-col items-center justify-center gap-6 bg-canvas px-4 py-12 sm:px-8">
        <p className="heading-6 text-ink lg:hidden">Academy Desk</p>
        {children}
      </main>
    </div>
  );
}
