import Link from 'next/link';

export default function Footer({ minimal = false }: { minimal?: boolean }) {
  if (minimal) {
    return (
      <footer className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-xs text-[--text-dim] shrink-0">
        <span>
          SquishyMind · {new Date().getFullYear()}{' '}
          <a
            href="https://threesided.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            (by ThreeSided Studios)
          </a>
        </span>
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
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col items-center sm:items-start md:flex-row md:items-center md:justify-between gap-5 sm:gap-4 text-sm text-[--text-dim]">
          <div className="flex items-center gap-3">
            <img
              src="/brain.svg"
              alt=""
              width={28}
              height={28}
              loading="lazy"
              decoding="async"
              className="opacity-80"
              style={{ filter: 'drop-shadow(0 2px 6px rgba(236, 72, 153, 0.2))' }}
            />
            <span>
              SquishyMind · {new Date().getFullYear()}{' '}
              <a
                href="https://threesided.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                (by ThreeSided Studios)
              </a>
            </span>
          </div>
          <nav className="flex items-center justify-center sm:justify-start gap-4 sm:gap-5 flex-wrap">
            <Link
              href="/changelog"
              className="hover:text-white transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
              What&apos;s new
            </Link>
            <Link href="/features" className="hover:text-white transition-colors min-h-[44px] flex items-center">
              Features
            </Link>
            <Link href="/templates" className="hover:text-white transition-colors min-h-[44px] flex items-center">
              Templates
            </Link>
            <Link href="/use-cases" className="hover:text-white transition-colors min-h-[44px] flex items-center">
              Use cases
            </Link>
            <Link href="/compare" className="hover:text-white transition-colors min-h-[44px] flex items-center">
              Compare
            </Link>
            <Link href="/blog" className="hover:text-white transition-colors min-h-[44px] flex items-center">
              Blog
            </Link>
            <Link href="/pricing" className="hover:text-white transition-colors min-h-[44px] flex items-center">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-white transition-colors min-h-[44px] flex items-center">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-white transition-colors min-h-[44px] flex items-center">
              Sign up
            </Link>
          </nav>
        </div>
        <p className="text-xs text-[--text-dim] text-center sm:text-left italic">
          Your brain, but squishier &mdash; a little weirder than the other mapping tools, and proud of it.
        </p>
      </div>
    </footer>
  );
}
