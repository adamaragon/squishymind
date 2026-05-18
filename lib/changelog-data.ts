export type ShippedEntry = {
  version: string; // "v2.5"
  title: string;
  date: string; // "May 2026"
  highlights: string[]; // ≤12 words each, sentence case
  squishyNote?: string;
  /** Commit SHA at the time this entry was published. Used by
   *  scripts/draft-changelog.mjs to determine "since when" for the next draft. */
  commit?: string;
};

export type RoadmapEntry = {
  title: string;
  description: string;
  status: 'next' | 'soon' | 'considering';
};

export const shipped: ShippedEntry[] = [
  {
    version: 'v3.4',
    title: 'Founder Access — the honest version',
    date: 'May 2026',
    commit: '1b33c34',
    highlights: [
      'Retired the "free forever" promise — see /founder-access for why',
      'Beta signups now get Founder Access: half off Premium ($1.99/mo) forever',
      'Plus a bigger free tier you keep — 8 maps, 150 nodes, 40 voice minutes',
      'New /pricing page lays out the three tiers side by side',
      'Polish: icon-only delete on Tree cards, wider cards, brighter edges',
      'Fun SVG icons added to every feature card on the home page',
    ],
    squishyNote:
      'I changed my mind about "forever," darling. I prefer "honestly."',
  },
  {
    version: 'v3.3',
    title: 'Notes, images, and attachments — everywhere',
    date: 'May 2026',
    commit: '02db3ef',
    highlights: [
      'New side-drawer detail panel — open it from any view by clicking ⓘ',
      'Edit a node\'s note, image, and attachments without leaving the alt views',
      'Attach PDF, doc/docx, xls/csv, zip, audio, video — 10 MB cap',
      '≡ / ▣ / ◧ flag pills show at a glance which rows have what',
      'Tree view collapse layout is now height-aware — no more overlap',
    ],
    squishyNote: 'Darling, every node has secrets. Now you can keep them tidy.',
  },
  {
    version: 'v3.2',
    title: 'Views, Dazzled',
    date: 'May 2026',
    commit: '549c2d1',
    highlights: [
      'Outline view now folds, shows tree guides, and counts hidden descendants',
      'Tree view has zoom, fit-to-screen, gradient edges, and proper card lift',
      'Table view gets row numbers, colour tags, stats, and a density toggle',
      'Five-accent palette flows from Canvas into every other view',
      'Fixed a crash that stopped the editor loading for everyone today',
    ],
    squishyNote:
      'Same brain, four outfits. Pick the one that fits the mood.',
  },
  {
    version: 'v3.1',
    title: 'Imports & Four Views',
    date: 'May 2026',
    commit: '78d82d9',
    highlights: [
      'Bring existing notes in — paste or upload Markdown, CSV, OPML, or JSON',
      'Three new views beside the wobbly Canvas: Outline, Tree, Table',
      'Toggle from the toolbar; your last view sticks across sessions',
      'Same data rendered four ways — nothing converts on switch',
      'Squishy switches view by voice — “show me as a tree”',
    ],
    squishyNote: 'Bring your old stuff in, darling. I’ll make it look gorgeous.',
  },
  {
    version: 'v3.0',
    title: 'Collaboration. Done.',
    date: 'May 2026',
    commit: 'bdb358a',
    highlights: [
      'Threaded comments on any node — owners, editors, and commenters all post',
      '“Sam editing” badge appears on the node a collaborator opens',
      'Commenter role is now properly read-only on the canvas, with comments allowed',
      'Squishy notices when other people are in the map and mentions them naturally',
      'Premium signposting — free during beta and forever for early signups',
    ],
    squishyNote: 'There you all are. Try not to crowd me.',
  },
  {
    version: 'v2.10',
    title: 'Two Brains',
    date: 'April 2026',
    commit: 'c8e28ef',
    highlights: [
      'Invite people by email as Editor or Commenter, all from the editor',
      'See each other’s cursors moving on the canvas in real time',
      'Edits sync between browsers in about a second — no refresh',
      'Members panel for owners to change roles or remove access',
      'More v3 collaboration features (edit awareness, comments) on the way',
    ],
    squishyNote: 'Two brains are weirder than one, darling. Bring a friend.',
  },
  {
    version: 'v2.9',
    title: 'Templates, Drag-to-Move, Voice Themes',
    date: 'April 2026',
    commit: '1d76feb',
    highlights: [
      'Eight starter templates so a blank brain isn’t the first sight',
      '“+ New map” opens a picker — project planning, brainstorm, OKRs, more',
      'Drag a branch onto another node to re-parent the whole subtree',
      'Ask Squishy to switch themes — aurora, sunrise, forest, mono',
      'Apply a template by voice; Cmd+Z reverts the whole map',
    ],
    squishyNote: 'Pick a template, darling. Or don’t. I work with what you give me.',
  },
  {
    version: 'v2.8',
    title: 'Squishy Knows You',
    date: 'March 2026',
    commit: 'ebf3ac4',
    highlights: [
      'Squishy now knows whether you’re signed in or not',
      'Logged-out visitors who ask for actions get routed to signup',
      'Beta banner moved into the hero, above the brain',
    ],
    squishyNote: 'Hello, stranger. Or are we past that already?',
  },
  {
    version: 'v2.7',
    title: 'Beta Launch & New Home',
    date: 'March 2026',
    commit: 'e26c412',
    highlights: [
      'Refreshed home page that actually shows what we built',
      'Persistent beta banner — sign up now and stay free forever',
      'Six rewritten feature cards and a noticeably weirder FAQ',
      'Recently shipped strip pulls live from the changelog',
    ],
    squishyNote: 'Free forever, darling. Don\'t make me beg.',
  },
  {
    version: 'v2.6',
    title: 'Changelog Page Added',
    date: 'February 2026',
    commit: 'bb8be1c',
    highlights: [
      'New changelog page to track updates',
      'Shared footer with a link to what\'s new',
    ],
    squishyNote: 'Keeping tabs on me, darling? How quaint.',
  },
  {
    version: 'v2.5',
    title: 'Voice-Driven Canvas Control',
    date: 'February 2026',
    commit: 'a748164',
    highlights: [
      'Squishy can create, edit, move, and delete nodes by voice',
      'Batch creation — “add five children under Research” in one breath',
      'Re-parenting via voice or drag (coming to UI soon)',
      'Universal undo with Cmd+Z, voice or no voice',
      'Camera control — Squishy can fly to any node on request',
    ],
    squishyNote:
      "Mmm. I can finally show you what I mean instead of just telling you. Try me.",
  },
  {
    version: 'v2.4',
    title: 'Squishy, the Voice Agent',
    date: 'January 2026',
    highlights: [
      'Persistent voice agent across page navigation',
      'Page-aware — she knows where you are',
      'Conversation resume across browser sessions',
      'Three voice modes — noir femme fatale, kawaii, clinical robot',
      'Voice-driven navigation between pages',
    ],
    squishyNote: "I followed you. Don't make it weird.",
  },
  {
    version: 'v2.0',
    title: 'The Backbone',
    date: 'December 2025',
    highlights: [
      'Server-synced editing — your maps work across devices',
      'Real share links with public, unlisted, and private visibility',
      'Read-only viewer for shared maps with sign-up nudge',
      'Two-click account deletion, no email confirmation',
    ],
  },
  {
    version: 'v1.0',
    title: 'Hello, brain',
    date: 'November 2025',
    highlights: [
      'Squishy mind-map canvas with wobbly nodes and wiggly edges',
      'Pulsing pink brain at the center of every map',
      'Email and password signup',
      'Four themes — Aurora, Sunrise, Forest, Mono',
      'Notes, color picker, infinite canvas',
    ],
    squishyNote: 'And so it began.',
  },
];

export const roadmap: RoadmapEntry[] = [
  {
    title: 'Squishy gets smarter at teaching',
    description:
      'Workflow and prompt revision so Squishy uses her new canvas powers at the right tutoring moments — building example maps with you in real time.',
    status: 'next',
  },
  {
    title: 'PNG and PDF export',
    description:
      'JSON export already works. Next: clean PNG of the whole canvas and a printable PDF, so you can drop a map into a slide or send it to someone who won’t sign up.',
    status: 'soon',
  },
  {
    title: 'Public gallery',
    description:
      'Browse public maps from the community. Discover patterns, fork to start your own.',
    status: 'considering',
  },
  {
    title: 'Mobile optimization',
    description:
      'A focused pass for touch interactions, smaller node sizing, simplified UI. The canvas works on mobile but is not yet polished.',
    status: 'considering',
  },
  {
    title: 'More templates, more often',
    description:
      'Curated additions to the template picker as patterns emerge — retros, weekly reviews, study guides. Templates aren’t a one-and-done.',
    status: 'considering',
  },
  {
    title: 'Mobile app',
    description:
      'Native iOS and Android, optimized for thumb-driven editing. Different beast from the in-browser mobile polish above — a real app on your home screen.',
    status: 'considering',
  },
  {
    title: 'Voice tours',
    description:
      'Squishy walks new users through their first map in a guided session — narrating, demoing, building example branches with them as they go.',
    status: 'considering',
  },
  {
    title: 'Webhook integrations',
    description:
      'Pipe events to Zapier, Slack, anywhere. Node created, comment added, map updated — anything you’d want to plug into your own automation.',
    status: 'considering',
  },
  {
    title: 'Custom themes',
    description:
      'Define your own colour palette beyond the four built-ins. Bring your brand to your brain, or just pick the colours your eyes actually like.',
    status: 'considering',
  },
];
