// Competitor comparison data. Shared by the /compare hub page and the
// per-competitor /compare/[slug] pages. Keeping it in one place means the
// hub summary and the deep-dive pages never drift apart.

export type Competitor = {
  slug: string;
  name: string;
  tagline: string;
  /** One-line meta description seed for the standalone page. */
  metaSeed: string;
  strengths: string[];
  weaknesses: string[]; // i.e. where SquishyMind wins
  verdict: string;
  /** Long-form intro for the standalone /compare/[slug] page. */
  intro: string;
  /** "Pick X if" / "Pick SquishyMind if" guidance. */
  pickThemIf: string;
  pickUsIf: string;
};

export const competitors: Competitor[] = [
  {
    slug: 'mindmeister',
    name: 'MindMeister',
    tagline: 'The established mind mapping tool',
    metaSeed:
      'SquishyMind vs MindMeister — a fair comparison of features, pricing, AI, and collaboration. Voice AI and a free beta vs an established classic.',
    strengths: [
      'Long track record — in the market since 2007',
      'Polished presentation mode for sharing maps',
      'MeisterTask integration for project management',
    ],
    weaknesses: [
      'Free plan capped at 3 maps — forces upgrade fast',
      'No voice AI or conversational interface',
      'Dated UI — less expressive than modern tools',
      'More expensive at scale: $4.99–$8.99/month per user',
    ],
    verdict:
      'If you need presentation-quality output and don’t mind a relatively old UI, MindMeister is solid. If you want voice AI, an animated canvas, and free access with no hard map cap, SquishyMind is the better call during beta.',
    intro:
      'MindMeister is one of the longest-running mind mapping tools on the market, and that maturity shows in its polish. But “mature” and “of-its-era” are two sides of the same coin. Here’s an honest look at how SquishyMind — a voice-first, AI-native newcomer — stacks up against the established classic.',
    pickThemIf:
      'presentation output and tight project-management integration are your top priorities, and you don’t care about AI assistance.',
    pickUsIf:
      'you want voice-driven mapping, an AI that builds branches for you, and a canvas that’s a genuine pleasure to sit in — free during beta with Founder pricing locked in for life.',
  },
  {
    slug: 'miro',
    name: 'Miro',
    tagline: 'The collaborative whiteboard platform',
    metaSeed:
      'SquishyMind vs Miro — focused mind mapping with voice AI vs a general-purpose enterprise whiteboard. Which one fits your team’s actual job?',
    strengths: [
      'Extremely versatile — far beyond just mind mapping',
      'Enterprise-grade — large teams, SSO, audit logs',
      'Huge template and integration marketplace',
    ],
    weaknesses: [
      'Free plan is limited to 3 editable boards',
      'No dedicated mind map mode — everything is freeform',
      'Overkill for individuals or small teams who just need maps',
      'No voice AI',
    ],
    verdict:
      'Miro is a whiteboard platform that happens to support mind maps. SquishyMind is a mind mapping app that happens to be collaborative. If mind mapping is your core use case — especially with voice AI — SquishyMind is more focused and more fun. If you need a general visual workspace for a large team, Miro is built for that.',
    intro:
      'Miro is a genuine powerhouse — a full collaborative whiteboard platform used by enterprises for everything from wireframes to retrospectives. That breadth is its strength and, for the specific job of mind mapping, its tax. Here’s how a purpose-built mind mapping app compares to a do-everything canvas.',
    pickThemIf:
      'you need an all-purpose visual workspace for a large organisation, with flowcharts, wireframes, and whiteboarding alongside maps.',
    pickUsIf:
      'mind mapping specifically is the job you’re hiring a tool for, and you want it focused, fast, voice-driven, and fun.',
  },
  {
    slug: 'obsidian',
    name: 'Obsidian',
    tagline: 'The local-first knowledge base with graph view',
    metaSeed:
      'SquishyMind vs Obsidian — a visual, collaborative, voice-driven canvas vs a local-first Markdown knowledge base. Two different philosophies compared.',
    strengths: [
      'Deeply local and private — all files live on your machine',
      'Hugely extensible plugin ecosystem',
      'Free for personal use',
    ],
    weaknesses: [
      'Graph view is a link graph, not a mind mapping tool',
      'No real-time collaboration built in (Sync is a paid add-on)',
      'Steep learning curve — you build your own system from scratch',
      'No voice AI',
    ],
    verdict:
      'Obsidian and SquishyMind are solving different problems. Obsidian is a local knowledge base for people who want full control of their files. SquishyMind is a visual thinking canvas for people who want to map ideas quickly — especially with voice. If you want Markdown-first, local, and extensible: Obsidian. If you want visual, animated, collaborative, and voice-first: SquishyMind.',
    intro:
      'Obsidian is beloved for good reason — a local-first fortress where your notes are plain Markdown files you fully own. But its famous graph view is often mistaken for a mind mapping tool, and it isn’t one. Here’s an honest comparison of two genuinely different philosophies of thinking software.',
    pickThemIf:
      'local-first privacy, file ownership, and a Markdown knowledge base matter most, and you enjoy building your own system.',
    pickUsIf:
      'you want a visual, collaborative, voice-driven canvas that works out of the box without assembling it from plugins.',
  },
  {
    slug: 'coggle',
    name: 'Coggle',
    tagline: 'Simple collaborative mind maps',
    metaSeed:
      'SquishyMind vs Coggle — clean simplicity vs voice AI, multiple views, and richer imports. A fair look at two collaborative mind mapping tools.',
    strengths: [
      'Very clean, simple UI — low learning curve',
      'More generous free plan than MindMeister',
      'Real-time collaborative',
    ],
    weaknesses: [
      'No voice AI or AI features of any kind',
      'Limited view modes — canvas only',
      'No import from Markdown, CSV, or OPML',
      'Minimal template library',
    ],
    verdict:
      'Coggle is a clean, honest mind mapping tool. SquishyMind adds a voice AI assistant, multiple view modes, richer imports, and more personality. If simplicity is your only criterion, Coggle is fine. If you want voice, AI expansion, multiple views, and a mascot who argues with you sometimes, SquishyMind wins.',
    intro:
      'Coggle keeps things deliberately simple, and there’s real virtue in that. But simple can shade into limited. Here’s how SquishyMind compares for people who want the approachability of Coggle plus voice AI, multiple views, and the ability to bring their existing notes in.',
    pickThemIf:
      'minimal, no-frills simplicity is your single most important criterion and you’ll never want AI or alternate views.',
    pickUsIf:
      'you want an approachable tool that also gives you voice AI, four view modes, and Markdown/CSV/OPML imports.',
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return competitors.find((c) => c.slug === slug);
}
