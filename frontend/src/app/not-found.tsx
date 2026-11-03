import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-4">
      <p className="caption-3 text-muted">Error 404</p>
      <h1 className="heading-4">This page is not on the desk</h1>
      <p className="body-3 text-muted">
        The link may be old, or the page may have moved. Go back to your home screen and pick up from there.
      </p>
      <Link
        href="/"
        className="motion-base rounded-lg bg-white px-3 py-2 button-md text-black hover:bg-white/85 active:scale-[0.98]"
      >
        Back to home
      </Link>
    </main>
  );
}
