import Link from 'next/link';
import { shipped } from '@/lib/changelog-data';

export default function RecentShipped() {
  const recent = shipped.slice(0, 3);

  return (
    <section className="max-w-5xl mx-auto px-6 py-16">
      <div className="flex items-baseline justify-between mb-8 flex-wrap gap-3">
        <h2 className="text-3xl font-semibold">Recently shipped</h2>
        <Link
          href="/changelog"
          className="text-sm text-[--text-dim] hover:text-white transition-colors flex items-center gap-1.5"
        >
          See the full roadmap <span>→</span>
        </Link>
      </div>
      <ul className="grid md:grid-cols-3 gap-4">
        {recent.map((entry) => (
          <li key={entry.version} className="glass rounded-2xl p-5">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-gradient-to-r from-pink-500/20 to-violet-500/20 border border-violet-500/30 text-xs font-mono">
                {entry.version}
              </span>
              <span className="text-xs text-[--text-dim] ml-auto">{entry.date}</span>
            </div>
            <h3 className="font-medium mb-3">{entry.title}</h3>
            <p className="text-sm text-[--text-dim] leading-relaxed">
              {entry.highlights[0]}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
