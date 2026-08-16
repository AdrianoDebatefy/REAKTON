import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 pt-24 text-center">
      <p className="text-sm uppercase tracking-[0.35em] text-white/40">404</p>
      <h1 className="mt-3 text-3xl font-light tracking-wide">Page not found</h1>
      <p className="mt-4 text-sm text-white/50">The page you requested does not exist.</p>
      <Link
        href="/"
        className="mt-10 inline-block rounded border border-white/20 px-6 py-3 text-sm uppercase tracking-widest text-white/70 transition hover:border-white/35 hover:bg-white/5"
      >
        Back to home
      </Link>
    </div>
  );
}
