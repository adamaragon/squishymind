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
    version: 'v2.10',
    title: 'Two Brains',
    date: 'May 2026',
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
    date: 'May 2026',
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
    date: 'May 2026',
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
    date: 'May 2026',
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
    date: 'May 2026',
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
    date: 'May 2026',
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
    date: 'April 2026',
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
    date: 'March 2026',
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
    date: 'February 2026',
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
    title: 'Finishing v3 collaboration',
    description:
      'The core just shipped — invites, presence, real-time sync. Still to come in v3.0 proper: “X is editing this node” badges, threaded comments on nodes, and Squishy noticing when other people are in the map with you.',
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
];
