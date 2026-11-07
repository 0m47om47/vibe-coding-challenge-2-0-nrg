import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-4">
      <BrandMark size={88} />
      <h1 className="heading-4 text-ink">Page not found</h1>
      <p className="body-5 text-ink-2">The link may be old, or the page may have moved. Go back to your home screen and start from there.</p>
      <Link
        href="/"
        className="motion-base inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 button-md text-on-primary hover:bg-primary-hover active:scale-[0.98]"
      >
        Back to home
      </Link>
    </main>
  );
}
