import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SITE = 'https://www.squishymind.com';

export const metadata = {
  title: 'Use Cases — Mind Mapping for Teams, Students & Creators | SquishyMind',
  description:
    'How teams, students, writers, and product managers use SquishyMind to think better. Real-time collaboration, voice AI, and an infinite canvas — free during beta.',
  alternates: { canonical: `${SITE}/use-cases` },
  openGraph: {
    title: 'Use Cases — SquishyMind',
    description:
      'How teams, students, writers, and product managers use SquishyMind to think better. Real-time collaboration, voice AI, and an infinite canvas — free during beta.',
    url: `${SITE}/use-cases`,
    type: 'website',
  },
};

const useCasesJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Use Cases', item: `${SITE}/use-cases` },
  ],
};

type UseCase = {
  id: string;
  audience: string;
  heading: string;
  body: string;
  bullets: string[];
  cta: string;
};

const USE_CASES: UseCase[] = [
  {
    id: 'teams',
    audience: 'For teams',
    heading: 'Mind mapping for teams that think out loud',
    body:
      'SquishyMind\'s real-time collaboration puts every team member\'s cursor on the same canvas. Brainstorm in parallel, restructure together, leave threaded comments on any node — all without the overhead of a slide deck.',
    bullets: [
      'Live cursors — see who\'s editing where, in real time',
      'Editor and Commenter roles for structured feedback rounds',
      'Threaded comments on individual nodes',
      'Share maps publicly, unlisted, or privately',
      'Import CSV data and meeting notes as instant maps',
    ],
    cta: 'Start a free team map →',
  },
  {
    id: 'students',
    audience: 'For students',
    heading: 'Mind mapping for students who learn by connecting ideas',
    body:
      'A lecture becomes a map in minutes. Import your notes, let Squishy expand bullet points into sub-branches, then reorganise by theme or topic. Study by doing, not by re-reading flat text.',
    bullets: [
      'Import Markdown notes directly from Obsidian or Notion',
      'AI text expansion turns bullet points into structured branches',
      'Outline view for linear revision; Canvas view for visual review',
      'Share a read-only link with study group',
      'Free during beta — no credit card required',
    ],
    cta: 'Map your first lecture →',
  },
  {
    id: 'writers',
    audience: 'For writers',
    heading: 'Mind mapping for writers who think in structure',
    body:
      'Outline a novel, plot a screenplay, map an essay before you write it. SquishyMind\'s Outline and Tree views let you see the hierarchy clearly; the Canvas view lets you see how ideas connect across the structure.',
    bullets: [
      'Three structural view modes: Outline, Tree, Canvas',
      'Drag-to-move nodes to rearrange chapters or plot points',
      'Add notes and context to any node',
      'Export to PNG or PDF to share with editors',
      'Voice brainstorming — talk your ideas into the canvas',
    ],
    cta: 'Start outlining →',
  },
  {
    id: 'product',
    audience: 'For product managers',
    heading: 'Mind mapping for product managers who need a war room',
    body:
      'Feature roadmaps, user journey maps, dependency trees — SquishyMind handles all of them. Use the Table view for structured data, the Canvas for relationships, and Squishy for fast ideation.',
    bullets: [
      'Table view for node-by-node data entry and editing',
      'Canvas view to map dependencies and relationships visually',
      'Collaborate with engineers and designers in real time',
      'Import sprint data from CSV in seconds',
      'Founder Access pricing locks in during beta — $2.99/month forever',
    ],
    cta: 'Build a roadmap →',
  },
  {
    id: 'solo',
    audience: 'For solo thinkers',
    heading: 'A second brain that talks back',
    body:
      'SquishyMind works perfectly well as a personal knowledge system — your own thinking space, no team required. Use templates to bootstrap a PARA-style second brain, or let Squishy help you build your own structure from scratch.',
    bullets: [
      'Second-brain template based on the PARA method',
      'Public maps for sharing; private maps for thinking',
      'Eight pre-built templates for common use cases',
      'Your maps sync across every browser you\'re logged into',
      'Delete your account in two clicks if it\'s not for you',
    ],
    cta: 'Build your second brain →',
  },
];

export default function UseCasesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(useCasesJsonLd) }}
      />
      <Header />
      <main className="px-6">
        {/* Hero */}
        <section className="max-w-4xl mx-auto pt-16 pb-12 text-center">
          <h1 className="text-display font-bold tracking-display mb-5 leading-[1.05]">
            Your brain works differently.{' '}
            <span className="gradient-text">So does SquishyMind.</span>
          </h1>
          <p className="text-lg md:text-xl text-[--text-dim] max-w-3xl mx-auto leading-relaxed mb-8">
            Teams, students, writers, and solo thinkers use SquishyMind to capture, connect,
            and communicate ideas. Here&apos;s how.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {USE_CASES.map((uc) => (
              <a
                key={uc.id}
                href={`#${uc.id}`}
                className="px-4 py-1.5 rounded-full text-sm glass border border-white/10 text-[--text-dim] hover:text-white transition-colors"
              >
                {uc.audience}
              </a>
            ))}
          </div>
        </section>

        {/* Use case sections */}
        {USE_CASES.map((uc, idx) => (
          <section
            key={uc.id}
            id={uc.id}
            className="max-w-5xl mx-auto pb-20 scroll-mt-8"
          >
            <div className="glass rounded-2xl p-8 md:p-10">
              {/* Hero image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/usecases/${uc.id}.jpg`}
                alt={uc.heading}
                width={1200}
                height={800}
                loading="lazy"
                decoding="async"
                className="rounded-2xl border border-white/10 aspect-[3/2] object-cover w-full mb-8"
              />
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">
                {uc.audience}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{uc.heading}</h2>
              <p className="text-[--text-dim] leading-relaxed mb-6 max-w-3xl">{uc.body}</p>
              <ul className="space-y-2.5 mb-8">
                {uc.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-[--text-dim] leading-relaxed">
                    <span className="text-violet-400 mt-0.5 shrink-0" aria-hidden>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn btn-primary text-sm px-6 py-2.5">
                {uc.cta}
              </Link>
            </div>
            {idx < USE_CASES.length - 1 && <div className="mt-12 border-t border-white/5" />}
          </section>
        ))}

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            See what SquishyMind can do for you.
          </h2>
          <p className="text-[--text-dim] mb-7 text-lg leading-relaxed">
            Free during beta. Sign up now and lock in Founder Access — 40% off
            Premium forever. No credit card.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup" className="btn btn-primary text-base px-7 py-3">
              Sign up free →
            </Link>
            <Link href="/features" className="btn btn-ghost text-base px-7 py-3">
              See all features
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
