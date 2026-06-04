import Link from 'next/link';

export default function Footer({ minimal = false }: { minimal?: boolean }) {
  if (minimal) {
    return (
      <footer className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-xs text-[--text-dim] shrink-0">
        <span>SquishyMind · {new Date().getFullYear()}</span>
        <Link
          href="/changelog"
          className="hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
          What&apos;s new
        </Link>
      </footer>
    );
  }

  return (
    <footer className="px-6 py-10 border-t border-white/5 mt-16">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-[--text-dim]">
        <div className="flex items-center gap-3">
          <img
            src="/brain.svg"
            alt=""
            width={28}
            height={28}
            loading="lazy"
            decoding="async"
            className="opacity-80"
          />
          <span>SquishyMind · {new Date().getFullYear()}</span>
        </div>
        <nav className="flex items-center gap-5 flex-wrap">
          <Link
            href="/changelog"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
            What&apos;s new
          </Link>
          <Link href="/features" className="hover:text-white transition-colors">
            Features
          </Link>
          <Link href="/use-cases" className="hover:text-white transition-colors">
            Use cases
          </Link>
          <Link href="/compare" className="hover:text-white transition-colors">
            Compare
          </Link>
          <Link href="/pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-white transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-white transition-colors">
            Sign up
          </Link>
        </nav>
      </div>
    </footer>
  );
}
