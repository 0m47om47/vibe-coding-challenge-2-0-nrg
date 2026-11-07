import { SportFilterProvider } from "@/components/SportFilter";
import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Dumka Academy Desk", template: "%s · Dumka Academy Desk" },
  description:
    "High-performance sports academy desk. Attendance tracking, match fixture score sheets, and talent scout readiness radar.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f7fd" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={beVietnam.variable}>
      <body className="min-h-dvh bg-canvas text-ink antialiased selection:bg-primary selection:text-on-primary">
        <a
          href="#main"
          className="fixed left-4 top-4 z-50 -translate-y-24 rounded-xl bg-primary px-3.5 py-2 button-sm font-bold text-on-primary border border-accent/60 focus:translate-y-0"
        >
          Skip to content
        </a>
        <AuthProvider>
          <SportFilterProvider>{children}</SportFilterProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
