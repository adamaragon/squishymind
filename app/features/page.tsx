import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Features — SquishyMind Mind Mapping App',
  description:
    'Voice AI, real-time collaboration, infinite canvas, multiple view modes, templates, and import/export. Everything you need to map your ideas — free during beta.',
};

const SITE = 'https://www.squishymind.com';

const featuresJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Features', item: `${SITE}/features` },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SquishyMind',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    url: SITE,
    featureList: [
      'Voice AI mind mapping assistant',
      'Real-time collaborative editing with live cursors',
      'Infinite canvas with animated nodes',
      'Canvas, Outline, Tree, and Table view modes',
      'AI text expansion on any node',
      'Import from Markdown, CSV, OPML, JSON',
      'PNG and PDF export',
      'Threaded comments on nodes',
      'Pre-built templates for common use cases',
      'Image and file attachments on nodes',
      'Public, unlisted, and private map sharing',
      'Auto-coloured branches',
    ],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  },
];

type FeatureSection = {
  id: string;
  label: string;
  heading: string;
  subheading: string;
  features: { title: string; body: string }[];
};

const SECTIONS: FeatureSection[] = [
  {
    id: 'voice-ai',
    label: 'Voice AI',
    heading: 'Squishy: your AI mind-mapping assistant',
    subheading:
      'Talk to your canvas. Squishy understands your map structure and can build, reorganise, summarise, and expand — entirely by voice.',
    features: [
      {
        title: 'Voice canvas control',
        body: 'Say "add a branch called Marketing under Strategy" and watch it appear. Squishy translates natural language into canvas operations — add nodes, move them, rename them, delete subtrees.',
      },
      {
        title: 'AI text expansion',
        body: 'Click any node and ask Squishy to expand it. She generates bullet-point children based on context — a starting point you shape, not a replacement for your thinking.',
      },
      {
        title: 'Context-aware conversation',
        body: 'Squishy knows what page you\'re on, whether you\'re logged in, and how many collaborators are in the map. She gives useful answers, not generic AI filler.',
      },
      {
        title: 'Persistent across sessions',
        body: 'Your conversation ID is saved in your browser. Pick up where you left off — Squishy remembers the thread of what you were working on.',
      },
    ],
  },
  {
    id: 'canvas',
    label: 'Canvas',
    heading: 'An infinite mind-mapping canvas that breathes',
    subheading:
      'Every node wobbles gently. Every edge wiggles. SquishyMind is built to feel alive — because a canvas that responds to you keeps you in flow longer.',
    features: [
      {
        title: 'Infinite canvas',
        body: 'Pan and zoom with no hard edges. Maps grow as your thinking grows — no grid lines, no page boundaries, no arbitrary size caps.',
      },
      {
        title: 'Drag-to-move nodes',
        body: 'Grab any node and drag it to reparent it. The canvas redraws edges live as you move, so reorganising large maps is a visual operation, not a menu hunt.',
      },
      {
        title: 'Auto-coloured branches',
        body: 'Every child node picks a colour different from its parent. Your maps look designed without any colour theory on your part.',
      },
      {
        title: 'Animated personality',
        body: 'Nodes breathe, edges wiggle, the brain pulses. None of this affects performance — it\'s all CSS, no JS animation loops.',
      },
    ],
  },
  {
    id: 'views',
    label: 'View modes',
    heading: 'Four ways to look at the same brain',
    subheading:
      'Switch between Canvas, Outline, Tree, and Table views without losing any data. Each mode reveals different structure in the same map.',
    features: [
      {
        title: 'Canvas view',
        body: 'The default spatial layout. Best for brainstorming, visual thinkers, and maps with complex branching structure.',
      },
      {
        title: 'Outline view',
        body: 'A collapsible document outline. Great for writers, structured thinkers, and maps that read better as a linear hierarchy.',
      },
      {
        title: 'Tree view',
        body: 'Classic hierarchical tree layout, left-to-right. Useful for org charts, decision trees, and technical architecture diagrams.',
      },
      {
        title: 'Table view',
        body: 'Each node row with inline editing. When your map is actually a list with sub-items, Table view makes data entry fast and structured.',
      },
    ],
  },
  {
    id: 'collaboration',
    label: 'Collaboration',
    heading: 'Real-time collaboration with live cursors',
    subheading:
      'Invite teammates, see their cursors move in real time, leave threaded comments on any node. SquishyMind is collaborative without being cluttered.',
    features: [
      {
        title: 'Live cursors and edits',
        body: 'Every collaborator\'s cursor shows up with their name. Edits sync between browsers in under a second via Supabase Realtime — no page refreshes, no merge conflicts.',
      },
      {
        title: 'Editor and Commenter roles',
        body: 'Editors can do anything you can. Commenters can read the map and leave threaded comments on nodes, but can\'t change the canvas. Useful for feedback rounds without chaos.',
      },
      {
        title: 'Threaded comments on nodes',
        body: 'Right-click any node to leave a comment. Comments thread, resolve, and stack — a full async feedback layer without leaving the canvas.',
      },
      {
        title: 'Invite by email',
        body: 'Type a teammate\'s email in the Members panel. They get an invite, accept it, and appear in your canvas within seconds.',
      },
    ],
  },
  {
    id: 'import-export',
    label: 'Import & export',
    heading: 'Bring your data in. Take it out whenever.',
    subheading:
      'Import from Markdown, CSV, OPML, and JSON. Export to PNG or PDF. Your maps are yours — no lock-in, no exit interview.',
    features: [
      {
        title: 'Markdown import',
        body: 'Paste a Markdown outline and SquishyMind turns heading levels into a node hierarchy. Great for converting notes, docs, or README files into a map.',
      },
      {
        title: 'CSV import',
        body: 'Import flat or hierarchical CSV data. Column headers become parent nodes; rows become children. Useful for turning spreadsheet data into a visual structure.',
      },
      {
        title: 'OPML import',
        body: 'The native format for outliners and RSS readers. Import any OPML file directly — your existing outline becomes a mind map.',
      },
      {
        title: 'PNG and PDF export',
        body: 'Export your canvas as a high-resolution PNG or a vector-clean PDF. Both include all visible nodes at the zoom level you choose.',
      },
    ],
  },
  {
    id: 'templates',
    label: 'Templates',
    heading: 'Eight starting points for when you're staring at a blank brain',
    subheading:
      'Pre-built templates for common thinking frameworks. Pick one, customise it, or let Squishy suggest the right one based on what you\'re working on.',
    features: [
      {
        title: 'Project planning',
        body: 'Phases, tasks, and dependencies laid out as a ready-to-edit map. Faster than starting from scratch when you know the shape of the work.',
      },
      {
        title: 'Decision tree',
        body: 'A branching decision framework with yes/no paths. Useful for product decisions, career choices, or any situation with a clear fork structure.',
      },
      {
        title: 'Second brain',
        body: 'A personal knowledge organisation template inspired by the PARA method. Inbox, projects, areas, resources, and archives as map branches.',
      },
      {
        title: 'And five more',
        body: 'Weekly review, learning notes, SWOT analysis, meeting agenda, and brainstorm dump. Squishy can suggest which one fits when you describe what you\'re working on.',
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      {featuresJsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <Header />
      <main className="px-6">
        {/* Hero */}
        <section className="max-w-4xl mx-auto pt-16 pb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-[1.05]">
            Everything you need to{' '}
            <span className="gradient-text">map your mind</span>.
          </h1>
          <p className="text-lg md:text-xl text-[--text-dim] max-w-3xl mx-auto leading-relaxed mb-8">
            A voice AI assistant. Real-time collaboration. Four view modes. Import from anywhere,
            export anywhere. All free during beta.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup" className="btn btn-primary text-base px-7 py-3">
              Try it free →
            </Link>
            <Link href="/pricing" className="btn btn-ghost text-base px-7 py-3">
              See pricing
            </Link>
          </div>
        </section>

        {/* Jump nav */}
        <nav className="max-w-4xl mx-auto pb-12" aria-label="Feature sections">
          <div className="flex flex-wrap gap-2 justify-center">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-4 py-1.5 rounded-full text-sm glass border border-white/10 text-[--text-dim] hover:text-white transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Feature sections */}
        {SECTIONS.map((section, idx) => (
          <section
            key={section.id}
            id={section.id}
            className="max-w-6xl mx-auto pb-20 scroll-mt-8"
          >
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">{section.heading}</h2>
              <p className="text-lg text-[--text-dim] max-w-3xl leading-relaxed">{section.subheading}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {section.features.map((f) => (
                <div key={f.title} className="glass rounded-2xl p-6">
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-[--text-dim] leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
            {idx < SECTIONS.length - 1 && (
              <div className="mt-12 border-t border-white/5" />
            )}
          </section>
        ))}

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Start for free. Stay for the brain.
          </h2>
          <p className="text-[--text-dim] mb-7 text-lg leading-relaxed">
            Sign up during beta to lock in Founder Access — Premium at half price, forever.
            No credit card, no onboarding flow, no goals survey.
          </p>
          <Link href="/signup" className="btn btn-primary text-base px-8 py-3">
            Sign up free →
          </Link>
          <p className="text-xs text-[--text-dim] mt-4">
            Or{' '}
            <Link href="/use-cases" className="underline hover:text-white">
              see how people use SquishyMind
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
