export type ShippedEntry = {
  version: string; // "v2.5"
  title: string;
  date: string; // "May 2026"
  highlights: string[]; // ≤12 words each, sentence case
  squishyNote?: string;
};

export type RoadmapEntry = {
  title: string;
  description: string;
  status: 'next' | 'soon' | 'considering';
};

export const shipped: ShippedEntry[] = [
  {
    version: 'v2.5',
    title: 'Voice-Driven Canvas Control',
    date: 'May 2026',
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
    title: 'Drag to re-parent',
    description:
      'Drag a branch onto a different parent and watch the whole subtree relocate. The data model already supports it; this lights it up in the UI.',
    status: 'next',
  },
  {
    title: 'AI text expansion',
    description:
      'A silent ✨ button on any node generates 5–8 suggested children. For when you do not want to talk to her.',
    status: 'soon',
  },
  {
    title: 'Real-time collaboration',
    description:
      'Multi-cursor, “X is editing this node” indicators, email invites for editors and commenters. Maps become team artifacts.',
    status: 'soon',
  },
  {
    title: 'Comments on nodes',
    description:
      'Threaded discussions attached to specific concepts. For commenters who want to give feedback without modifying structure.',
    status: 'soon',
  },
  {
    title: 'Templates',
    description:
      'Pre-built starting points — brainstorm, project planning, knowledge base, OKRs. Squishy can suggest one when you start a fresh map.',
    status: 'considering',
  },
  {
    title: 'Public gallery',
    description:
      'Browse public maps from the community. Discover patterns, fork to start your own.',
    status: 'considering',
  },
  {
    title: 'Voice-driven themes',
    description:
      '“Squishy, switch to forest.” She does. Possibly the lowest-effort highest-charm feature on this list.',
    status: 'considering',
  },
  {
    title: 'Mobile optimization',
    description:
      'A focused pass for touch interactions, smaller node sizing, simplified UI. The canvas works on mobile but is not yet polished.',
    status: 'considering',
  },
];
