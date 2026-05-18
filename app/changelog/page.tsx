import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareButtons from '@/components/ShareButtons';
import {
  shipped,
  roadmap,
  type ShippedEntry,
  type RoadmapEntry,
} from '@/lib/changelog-data';

export const metadata = {
  title: "What's new — SquishyMind",
  description: 'See what we shipped recently and what is coming next.',
};

export default function ChangelogPage() {
  const next = roadmap.filter((r) => r.status === 'next');
  const soon = roadmap.filter((r) => r.status === 'soon');
  const considering = roadmap.filter((r) => r.status === 'considering');

  return (
    <>
      <Header />
      <main className="px-6">
        {/* Hero */}
        <section className="max-w-4xl mx-auto pt-16 pb-12 text-center">
          <div className="inline-block mb-5 changelog-brain">
            <img src="/brain.svg" alt="" width={120} height={120} />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
            <span className="gradient-text">What&apos;s new</span>
            <span className="text-[--text-dim]"> &amp; what&apos;s next</span>
          </h1>
          <p className="text-lg text-[--text-dim] max-w-2xl mx-auto">
            We ship loudly, change minds publicly, and tell you what&apos;s coming.
            Subscribe to the brain, not the press release.
          </p>
        </section>

        {/* Roadmap */}
        <section className="max-w-6xl mx-auto py-12">
          <div className="flex items-baseline gap-3 mb-8 flex-wrap">
            <h2 className="text-3xl font-semibold">Coming up</h2>
            <span className="text-sm text-[--text-dim]">
              No promised dates. We ship when it&apos;s ready.
            </span>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <RoadmapColumn label="Next" items={next} accent="from-pink-500 to-violet-500" pulse />
            <RoadmapColumn label="Soon" items={soon} accent="from-violet-500 to-cyan-500" />
            <RoadmapColumn
              label="Considering"
              items={considering}
              accent="from-cyan-500 to-amber-500"
            />
          </div>
        </section>

        {/* Changelog */}
        <section className="max-w-4xl mx-auto py-12">
          <h2 className="text-3xl font-semibold mb-8">What we shipped</h2>
          <ol className="relative border-l border-white/10 ml-3 space-y-10 pl-8">
            {shipped.map((entry) => (
              <ShippedCard key={entry.version} entry={entry} />
            ))}
          </ol>
        </section>

        <ShareButtons
          heading="Found something fun in here?"
          blurb="Share what's new — Squishy thrives on word of mouth."
          text="SquishyMind keeps shipping — check out what's new"
        />
      </main>
      <Footer />

      <style>{`
        @keyframes changelogBrainWobble {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25%      { transform: scale(1.06) rotate(-3deg); }
          50%      { transform: scale(1.02) rotate(2deg); }
          75%      { transform: scale(1.08) rotate(3deg); }
        }
        .changelog-brain {
          animation: changelogBrainWobble 3.6s ease-in-out infinite;
          transform-origin: 50% 60%;
          filter: drop-shadow(0 0 14px rgba(255, 130, 170, 0.45))
                  drop-shadow(0 0 28px rgba(236, 72, 153, 0.35));
        }
      `}</style>
    </>
  );
}

function RoadmapColumn({
  label,
  items,
  accent,
  pulse = false,
}: {
  label: string;
  items: RoadmapEntry[];
  accent: string;
  pulse?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-block h-2 w-2 rounded-full bg-gradient-to-br ${accent} ${pulse ? 'animate-pulse' : ''}`}
        />
        <h3 className="text-lg font-medium">{label}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.title}
            className="glass rounded-xl p-4 transition-all hover:border-white/20 hover:scale-[1.01]"
          >
            <h4 className="font-medium mb-1">{item.title}</h4>
            <p className="text-sm text-[--text-dim] leading-relaxed">{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShippedCard({ entry }: { entry: ShippedEntry }) {
  return (
    <li className="relative">
      {/* Dot on the timeline */}
      <span className="absolute -left-[42px] top-2 h-3 w-3 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 ring-4 ring-[--bg-1]" />
      <div className="glass rounded-2xl p-6">
        <div className="flex items-baseline gap-3 mb-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-pink-500/20 to-violet-500/20 border border-violet-500/30 text-xs font-mono">
            {entry.version}
          </span>
          <h3 className="text-xl font-semibold">{entry.title}</h3>
          <span className="text-xs text-[--text-dim] ml-auto">{entry.date}</span>
        </div>
        <ul className="space-y-2 mb-4">
          {entry.highlights.map((h) => (
            <li key={h} className="text-sm text-[--text-dim] flex gap-2 items-start">
              <span className="text-pink-400 shrink-0">▸</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
        {entry.squishyNote && (
          <blockquote className="border-l-2 border-pink-500/40 pl-3 py-1 italic text-sm text-[--text-dim] bg-pink-500/5 rounded-r">
            <span className="text-pink-400 font-mono text-xs not-italic mr-2">
              Squishy:
            </span>
            {entry.squishyNote}
          </blockquote>
        )}
      </div>
    </li>
  );
}
