import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Academy Desk", template: "%s · Academy Desk" },
  description:
    "Attendance, matches and trial readiness for one sports academy. The coach marks who came, records scores, and the scout sees who is ready.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-dvh bg-canvas text-white">
        <a
          href="#main"
          className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-white px-3 py-2 button-sm text-black focus:translate-y-0"
        >
          Skip to content
        </a>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
