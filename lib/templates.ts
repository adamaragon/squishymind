import type { MindMapData, MindMapNode } from './types';

export type Template = {
  id: string;
  name: string;
  description: string;
  icon: string;
  data: MindMapData;
};

/** A branch in template data. Plain strings shorthand a label-only leaf;
 *  the object form supports a `note` and recursive `children`. Depth is
 *  bounded only by sanity — current templates use up to depth 3. */
export type TemplateBranch =
  | string
  | { label: string; note?: string; children?: TemplateBranch[] };

/**
 * Build a MindMapData from a recursive branch description.
 *
 * Depth 1 branches distribute evenly around a full circle from the root.
 * Deeper levels spread on a narrowing arc opening outward from their
 * parent — radii shrink at each depth so a 50-node template still fits
 * inside a couple of screens without overlap.
 */
function makeTemplate(rootLabel: string, branches: TemplateBranch[]): MindMapData {
  const nodes: Record<string, MindMapNode> = {};
  const childIndex: Record<string, string[]> = {};
  let counter = 1;
  const nextId = () => `n${counter++}`;
  const now = Date.now();

  const rootId = nextId();
  nodes[rootId] = {
    id: rootId,
    label: rootLabel,
    x: 0,
    y: 0,
    parentId: null,
    depth: 0,
    colorIdx: 0,
    note: '',
    createdAt: now,
  };

  // Radii decrease with depth so deeper nodes don't run off the screen.
  // The defaults match the imperative canvas's own placeChild layout.
  function radiusFor(depth: number): number {
    if (depth === 1) return 240;
    if (depth === 2) return 190;
    if (depth === 3) return 150;
    return 120;
  }

  function placeChildren(
    parent: MindMapNode,
    outwardAngle: number,
    parentColorIdx: number,
    children: TemplateBranch[],
    depth: number,
  ) {
    if (children.length === 0) return;
    const radius = radiusFor(depth);
    const n = children.length;

    // At depth 1 children spread around the full circle from the root.
    // At deeper levels they fan out on an arc centred on the parent's
    // own outward angle — tighter as siblings increase but capped so a
    // wide group doesn't curl back on itself.
    const arcSpan =
      depth === 1
        ? Math.PI * 2
        : Math.min(Math.PI * 0.9, Math.max(0.6, n * 0.42));

    children.forEach((raw, i) => {
      const obj = typeof raw === 'string' ? { label: raw } : raw;
      let angle: number;
      if (depth === 1) {
        angle = (i / n) * Math.PI * 2;
      } else if (n === 1) {
        angle = outwardAngle;
      } else {
        const step = arcSpan / (n - 1);
        angle = outwardAngle + (i - (n - 1) / 2) * step;
      }

      const id = nextId();
      const colorIdx = (parentColorIdx + i + 1) % 5;
      nodes[id] = {
        id,
        label: obj.label,
        x: parent.x + Math.cos(angle) * radius,
        y: parent.y + Math.sin(angle) * radius,
        parentId: parent.id,
        depth,
        colorIdx,
        note: obj.note || '',
        createdAt: now,
      };
      (childIndex[parent.id] = childIndex[parent.id] || []).push(id);

      if (obj.children && obj.children.length > 0) {
        // Pass `angle` (the direction from parent to THIS node) as the
        // outward direction for this node's own children.
        placeChildren(nodes[id], angle, colorIdx, obj.children, depth + 1);
      }
    });
  }

  placeChildren(nodes[rootId], 0, 0, branches, 1);
  return { nodes, childIndex, rootId };
}

export const templates: Template[] = [
  // ---- Deep professional templates (showcase: real work, mapped) ----
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    description:
      'A complete, run-it-tomorrow campaign plan — objective and KPIs, audience, message, every channel with real tactics, a content calendar, budget split, and a measurement loop. The kind of map you’d actually present to a client.',
    icon: '🚀',
    data: makeTemplate('Q3 Campaign: “Squish Your Week”', [
      {
        label: '🎯 Objective & KPIs',
        note: 'One sentence the whole team can repeat. Tie every tactic back to this.',
        children: [
          { label: 'Primary goal', note: 'Drive 2,000 free signups in 8 weeks.' },
          { label: 'North-star KPI', note: 'Signups from campaign UTM, not vanity reach.' },
          { label: 'Secondary KPIs', children: ['Email CTR ≥ 3%', 'Landing CVR ≥ 8%', 'CAC ≤ $9'] },
          { label: 'Guardrails', note: 'What we won’t do to hit the number.', children: ['No dark patterns', 'No discounting Founder pricing'] },
        ],
      },
      {
        label: '👥 Audience',
        children: [
          { label: 'Primary persona', note: 'ADHD pro, 25–40, drowning in tabs & to-do apps.', children: ['Pain: overwhelm', 'Trigger: a chaotic Monday', 'Watering holes: Reddit, TikTok, newsletters'] },
          { label: 'Secondary persona', note: 'Team lead running messy brainstorms.', children: ['Pain: scattered ideation', 'Buys for the team'] },
          { label: 'Exclusions', note: 'Who we deliberately ignore this quarter.', children: ['Enterprise procurement', 'Students (next campaign)'] },
        ],
      },
      {
        label: '💬 Message & hook',
        children: [
          { label: 'Single-minded message', note: '“Your brain, but squishier” — think out loud, get organised.' },
          { label: 'Proof points', children: ['Voice AI that builds the map', 'Free during beta', '40% off Founder pricing forever'] },
          { label: 'Hook variations', note: 'Test 3 angles.', children: ['The 11pm brain-dump', 'Lists vs maps', 'Talk, don’t type'] },
        ],
      },
      {
        label: '📡 Channels & tactics',
        children: [
          { label: 'Organic social', note: 'Owned, daily, cheap.', children: [{ label: 'TikTok', note: '3×/wk: screen-recorded voice-mapping demos.' }, { label: 'X / LinkedIn', note: 'Build-in-public + repurpose the blog.' }] },
          { label: 'Content / SEO', note: 'Compounding.', children: ['Publish weekly (already queued)', 'Push “mind mapping for ADHD” cluster', 'Repurpose posts → threads'] },
          { label: 'Paid', note: 'Only after organic CVR is proven.', children: [{ label: 'Reddit ads', note: 'r/ADHD, r/productivity — value-first.' }, { label: 'Retargeting', note: 'Visited /pricing, didn’t sign up.' }] },
          { label: 'Email', children: ['Welcome sequence', 'Founder-pricing deadline nudge', 'Re-engage dormant signups'] },
          { label: 'Partnerships', note: 'Borrow audiences.', children: ['ADHD creators', 'Productivity newsletters'] },
        ],
      },
      {
        label: '🗓 Content calendar',
        children: [
          { label: 'Weeks 1–2: Awareness', note: 'Hooks + blog launch.' },
          { label: 'Weeks 3–5: Consideration', note: 'Demos, comparisons, testimonials.' },
          { label: 'Weeks 6–8: Conversion', note: 'Founder-pricing urgency.' },
        ],
      },
      {
        label: '💰 Budget',
        children: [
          { label: 'Paid media', note: '$4k — held until organic proof.' },
          { label: 'Creator partnerships', note: '$2.5k.' },
          { label: 'Tools & production', note: '$1k.' },
          { label: 'Contingency', note: '15% reserve.' },
        ],
      },
      {
        label: '📈 Measure & iterate',
        children: [
          { label: 'Weekly dashboard', note: 'Signups, CVR, CAC, channel split.' },
          { label: 'Kill / scale rule', note: 'Scale what beats $9 CAC; cut what doesn’t within 10 days.' },
          { label: 'Retro', note: 'Wins to repeat, lessons, next-campaign hypotheses.' },
        ],
      },
    ]),
  },
  {
    id: 'seo-project',
    name: 'SEO Project',
    description:
      'A full SEO engagement mapped end to end — technical audit, keyword research and clustering, on-page, content production, authority building, and reporting. Mirrors how an agency actually runs a project.',
    icon: '🔍',
    data: makeTemplate('SEO Project', [
      {
        label: '🔎 Audit & baseline',
        children: [
          { label: 'Technical crawl', note: 'Screaming Frog / Sitebulb: status codes, redirects, depth.', children: ['Indexability', 'Broken links', 'Duplicate content', 'Canonicals'] },
          { label: 'Core Web Vitals', note: 'LCP / INP / CLS by template.', children: ['Mobile first', 'Field + lab data'] },
          { label: 'Baseline metrics', children: ['Current rankings', 'Organic traffic', 'Indexed pages'] },
          { label: 'Analytics health', note: 'GA4 + Search Console wired, events firing.' },
        ],
      },
      {
        label: '🧩 Keyword research',
        children: [
          { label: 'Seed list', note: 'From product, blog, competitors.' },
          { label: 'Clusters', note: 'Group by intent; one pillar per cluster.', children: [{ label: 'Mind mapping (info)', note: 'How-to, what-is, benefits.' }, { label: 'ADHD productivity (info)', note: 'High-empathy, high-intent.' }, { label: 'Alternatives (commercial)', note: 'vs MindMeister / Miro / Obsidian.' }] },
          { label: 'Prioritise', note: 'Volume × intent × difficulty × fit.', children: ['Quick wins', 'Pillar bets'] },
        ],
      },
      {
        label: '📄 On-page',
        children: [
          { label: 'Title & meta', note: 'Keyword-forward, 150–160 chars, unique.' },
          { label: 'Headings & structure', note: 'One H1, logical H2/H3, scannable.' },
          { label: 'Internal linking', note: 'Pillar ↔ cluster, descriptive anchors.' },
          { label: 'Schema', note: 'Article, FAQ, Breadcrumb, Product/Offer.' },
        ],
      },
      {
        label: '⚙️ Technical fixes',
        children: [
          { label: 'Sitemap & robots', note: 'Auto-generated, submitted to GSC.' },
          { label: 'Render & speed', note: 'SSR/ISR, image CDN, lazy-load.' },
          { label: 'Mobile & a11y', note: 'A11y wins double as SEO + UX wins.' },
        ],
      },
      {
        label: '✍️ Content production',
        children: [
          { label: 'Briefs', note: 'Target keyword, intent, outline, internal links.' },
          { label: 'Calendar', note: 'Weekly cadence; backdate + queue.' },
          { label: 'Refresh old content', note: 'Update, consolidate, re-promote.' },
        ],
      },
      {
        label: '🔗 Authority',
        children: [
          { label: 'Digital PR', note: 'Data studies; the “mind mapping for ADHD” angle.' },
          { label: 'Guest & partnerships', note: 'Relevant, not spammy.' },
          { label: 'Unlinked mentions', note: 'Reclaim → links.' },
        ],
      },
      {
        label: '📊 Reporting',
        children: [
          { label: 'Monthly report', note: 'Rankings, traffic, conversions, what shipped.' },
          { label: 'Dashboards', note: 'Live, stakeholder-readable.' },
          { label: 'Next-sprint plan', note: 'Always end with the next 30 days.' },
        ],
      },
    ]),
  },
  {
    id: 'website-build',
    name: 'Website Build',
    description:
      'A web project from kickoff to post-launch — discovery, information architecture, design, content, development, QA, launch, and the things everyone forgets afterward. A real delivery plan you can hand a team.',
    icon: '🌐',
    data: makeTemplate('Website Build', [
      {
        label: '🧭 Discovery',
        children: [
          { label: 'Goals', note: 'What does the site need to *do*? (leads, signups, credibility)' },
          { label: 'Audience & jobs', note: 'Who, and what they’re trying to accomplish.' },
          { label: 'Success metrics', children: ['Conversion rate', 'Bounce / engagement', 'Page speed'] },
          { label: 'Constraints', children: ['Budget', 'Timeline', 'Brand / legal', 'Tech stack'] },
        ],
      },
      {
        label: '🗂 IA & sitemap',
        children: [
          { label: 'Page inventory', note: 'Every page + its purpose + primary CTA.' },
          { label: 'Navigation', note: 'Primary, footer, utility.' },
          { label: 'User flows', note: 'Map the 2–3 critical paths to conversion.' },
          { label: 'URL structure', note: 'Clean, logical, SEO-friendly.' },
        ],
      },
      {
        label: '🎨 Design',
        children: [
          { label: 'Wireframes', note: 'Low-fi; structure before pixels.' },
          { label: 'Design system', children: ['Colour & type', 'Components', 'Spacing & grid'] },
          { label: 'Hi-fi mockups', note: 'Key templates: home, landing, detail.' },
          { label: 'Responsive', note: 'Mobile-first; test the real breakpoints.' },
          { label: 'Accessibility', note: 'Contrast, focus states, semantics — bake in, don’t bolt on.' },
        ],
      },
      {
        label: '📝 Content',
        children: [
          { label: 'Copy', note: 'Voice, headlines, CTAs — write to the job-to-be-done.' },
          { label: 'Media', note: 'Images, video, icons; optimise before upload.' },
          { label: 'SEO metadata', note: 'Titles, descriptions, OG cards, schema.' },
        ],
      },
      {
        label: '💻 Development',
        children: [
          { label: 'Setup', children: ['Repo & CI', 'Framework', 'Hosting'] },
          { label: 'Build', children: ['Components', 'Pages', 'CMS / data', 'Forms & integrations'] },
          { label: 'Performance', note: 'Budget the bundle, lazy-load, cache.' },
        ],
      },
      {
        label: '✅ QA',
        children: [
          { label: 'Cross-browser & device', note: 'The matrix that matters to *your* users.' },
          { label: 'Functional', note: 'Forms, links, flows, error states.' },
          { label: 'Lighthouse', note: 'Perf / A11y / Best-practices / SEO — aim for 100s.' },
          { label: 'Content proof', note: 'Typos, broken images, placeholder text.' },
        ],
      },
      {
        label: '🚀 Launch',
        children: [
          { label: 'Pre-flight', children: ['Analytics live', 'Redirects mapped', 'Backups', '404 handling'] },
          { label: 'Go-live', note: 'DNS, SSL, deploy, smoke test.' },
          { label: 'Announce', note: 'Email, social, internal.' },
        ],
      },
      {
        label: '🔧 Post-launch',
        children: [
          { label: 'Monitor', note: 'Errors, speed, uptime, funnels.' },
          { label: 'Submit sitemap', note: 'GSC + Bing.' },
          { label: 'Iterate', note: 'First-week data → quick wins.' },
          { label: 'Handoff', note: 'Docs, training, who owns what.' },
        ],
      },
    ]),
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    description:
      'A go-to-market launch mapped across pre-launch, launch day, and the follow-through — positioning, an asset checklist, the channel plan, and the metrics that tell you if it worked.',
    icon: '📣',
    data: makeTemplate('Product Launch', [
      {
        label: '🧠 Positioning',
        children: [
          { label: 'Who it’s for', note: 'The one audience that will care most on day one.' },
          { label: 'Category', note: 'What does the buyer compare it to?' },
          { label: 'Differentiator', note: 'The thing only you can say.' },
          { label: 'One-liner', note: 'The sentence you’ll repeat everywhere.' },
        ],
      },
      {
        label: '⏳ Pre-launch',
        children: [
          { label: 'Waitlist / teaser', note: 'Build demand before the door opens.' },
          { label: 'Beta & testimonials', note: 'Quotes and proof you can use on day one.' },
          { label: 'Press & creators', note: 'Brief them under embargo.' },
          { label: 'Asset production', note: 'See the checklist branch.' },
        ],
      },
      {
        label: '🎬 Launch day',
        children: [
          { label: 'Sequencing', note: 'Hour-by-hour: who posts what, when.' },
          { label: 'Owned channels', children: ['Site / banner', 'Email blast', 'In-app'] },
          { label: 'Earned & social', children: ['Product Hunt', 'X / LinkedIn', 'Communities'] },
          { label: 'War room', note: 'Who’s monitoring + responding live.' },
        ],
      },
      {
        label: '📦 Asset checklist',
        children: ['Landing page', 'Demo video', 'Screenshots / GIFs', 'Email copy', 'Social copy + visuals', 'FAQ', 'Press kit'],
      },
      {
        label: '🔁 Post-launch',
        children: [
          { label: 'Nurture', note: 'Convert the surge into activated users.' },
          { label: 'Collect feedback', note: 'What landed, what confused.' },
          { label: 'Sustain', note: 'Evergreen content + retargeting.' },
        ],
      },
      {
        label: '📈 Metrics',
        children: [
          { label: 'Launch-day', children: ['Signups', 'Traffic sources', 'Conversion'] },
          { label: '30-day', children: ['Activation', 'Retention', 'CAC'] },
          { label: 'Learnings', note: 'Document for the next launch.' },
        ],
      },
    ]),
  },
  {
    id: 'content-strategy',
    name: 'Content Strategy',
    description:
      'A content engine on one canvas — goals, pillars, personas, formats, a production calendar, distribution, repurposing, and measurement. Built to show how content compounds, not just a list of post ideas.',
    icon: '✍️',
    data: makeTemplate('Content Strategy', [
      {
        label: '🎯 Goals',
        children: [
          { label: 'Business goal', note: 'e.g. organic signups, not “traffic”.' },
          { label: 'Content KPIs', children: ['Organic sessions', 'Email subs', 'Assisted conversions'] },
          { label: 'Brand role', note: 'What we want to be known for.' },
        ],
      },
      {
        label: '🏛 Pillars',
        note: '3–5 themes you can own. Everything ladders up to one.',
        children: [
          { label: 'Mind mapping', children: ['How-to', 'Benefits', 'Techniques'] },
          { label: 'ADHD & focus', children: ['Workflows', 'Tool fit', 'Empathy pieces'] },
          { label: 'Productivity', children: ['Comparisons', 'Reviews', 'Frameworks'] },
        ],
      },
      {
        label: '👤 Personas',
        children: [
          { label: 'The overwhelmed pro', note: 'Searches at 11pm, needs relief.' },
          { label: 'The team lead', note: 'Shares with a team; wants ROI.' },
        ],
      },
      {
        label: '🧱 Formats',
        children: ['Long-form guides', 'Comparisons', 'Short social', 'Email', 'Video / demo'],
      },
      {
        label: '🗓 Calendar',
        children: [
          { label: 'Cadence', note: 'Weekly long-form + daily social.' },
          { label: 'Backlog', note: 'Brief → draft → edit → publish.' },
          { label: 'Seasonal', note: 'New-year resolutions, back-to-school, etc.' },
        ],
      },
      {
        label: '📣 Distribution',
        note: 'Spend as long promoting as creating.',
        children: ['Owned (email, social)', 'Earned (PR, communities)', 'Paid (boost winners)', 'SEO (compounding)'],
      },
      {
        label: '♻️ Repurposing',
        children: [
          { label: '1 → many', note: 'Guide → thread → carousel → email → video script.' },
          { label: 'Refresh', note: 'Update top posts twice a year.' },
        ],
      },
      {
        label: '📊 Measure',
        children: ['Per-piece performance', 'Pillar-level trends', 'What to double down on'],
      },
    ]),
  },
  {
    id: 'creative-brief',
    name: 'Creative Brief',
    description:
      'The classic agency creative brief, mapped — background, the single objective, audience insight, the one message, deliverables, mandatories, tone, timeline, budget, and how success gets judged. Fill it in and it’s ready to brief a team.',
    icon: '📋',
    data: makeTemplate('Creative Brief', [
      { label: '📖 Background', note: 'Why are we doing this now? The context in 2–3 lines.', children: ['Business situation', 'What prompted the ask'] },
      { label: '🎯 Objective', note: 'The ONE thing this work must achieve. Specific and measurable.' },
      {
        label: '👥 Audience',
        children: [
          { label: 'Who', note: 'Demographics + mindset.' },
          { label: 'Insight', note: 'The human truth we’re tapping into.' },
          { label: 'Behaviour: now → desired', note: 'From what they do now to what we want.' },
        ],
      },
      { label: '💬 Single message', note: 'If they remember one thing, this is it. One sentence.' },
      {
        label: '📦 Deliverables',
        note: 'Exact assets, sizes, and quantities — no ambiguity.',
        children: ['Format(s)', 'Channels', 'Specs & sizes', 'Quantity'],
      },
      {
        label: '⚖️ Mandatories',
        children: ['Logo / brand rules', 'Legal / disclaimers', 'Must-include claims', 'Things to avoid'],
      },
      { label: '🎨 Tone & feel', note: 'Adjectives + references. Show, don’t just tell.', children: ['Voice', 'Visual references', 'Mood'] },
      { label: '🗓 Timeline', children: ['Kickoff', 'First drafts', 'Reviews', 'Final delivery'] },
      { label: '💰 Budget', note: 'Production + media, with a contingency line.' },
      { label: '✅ Success', note: 'How we’ll judge it — the metric and the gut-check.' },
    ]),
  },
  // ---- Thinking frameworks (structures pros already use) ----
  {
    id: 'fishbone',
    name: 'Fishbone (Cause & Effect)',
    description:
      'The Ishikawa root-cause framework — a problem at the centre and the six classic cause categories (the 6 Ms) branching off, each pre-seeded with prompts. Map why something’s going wrong before you fix the wrong thing.',
    icon: '🐟',
    data: makeTemplate('Problem / Effect', [
      { label: 'People', note: 'Skills, training, staffing, communication.', children: ['Skill gaps', 'Unclear ownership', 'Hand-off errors'] },
      { label: 'Process', note: 'Steps, workflow, policies.', children: ['Missing steps', 'Bottlenecks', 'No feedback loop'] },
      { label: 'Tools / Tech', note: 'Equipment, software, systems.', children: ['Wrong tool', 'Bugs / downtime', 'Manual where it should be automated'] },
      { label: 'Materials / Inputs', note: 'Data, assets, supplies.', children: ['Bad data', 'Late inputs', 'Inconsistent quality'] },
      { label: 'Environment', note: 'Context, market, culture.', children: ['Shifting priorities', 'External pressure', 'Remote friction'] },
      { label: 'Management', note: 'Decisions, incentives, measurement.', children: ['Wrong metric', 'Slow decisions', 'Misaligned incentives'] },
    ]),
  },
  {
    id: 'priority-matrix',
    name: '2×2 Priority Matrix',
    description:
      'The impact-vs-effort grid that cuts a long list down to what matters. Four quadrants — quick wins, big bets, fill-ins, and time sinks — so you can place every idea and act on the top-left first.',
    icon: '🔲',
    data: makeTemplate('Prioritise: Impact × Effort', [
      { label: '⚡ Quick wins', note: 'High impact · low effort — DO THESE FIRST.', children: ['Item A', 'Item B'] },
      { label: '🏔 Big bets', note: 'High impact · high effort — plan & resource.', children: ['Item C', 'Item D'] },
      { label: '🧹 Fill-ins', note: 'Low impact · low effort — do when idle.', children: ['Item E'] },
      { label: '🕳 Time sinks', note: 'Low impact · high effort — avoid / drop.', children: ['Item F'] },
    ]),
  },
  {
    id: 'roadmap-timeline',
    name: 'Timeline / Roadmap',
    description:
      'A Now / Next / Later roadmap — commit to the present, sketch the near term, and park the future without losing it. Each horizon holds its initiatives so stakeholders see direction without false precision.',
    icon: '🛣',
    data: makeTemplate('Roadmap', [
      { label: '▶️ Now', note: 'In flight this cycle. Committed.', children: [{ label: 'Initiative 1', note: 'Owner + due date.' }, { label: 'Initiative 2' }] },
      { label: '⏭ Next', note: 'Up soon — shaped but not started.', children: ['Initiative 3', 'Initiative 4'] },
      { label: '🔮 Later', note: 'Direction, not commitment. Revisit each cycle.', children: ['Idea 5', 'Idea 6'] },
      { label: '🧊 Parked', note: 'Good ideas, wrong time. Kept on purpose.', children: ['Someday'] },
    ]),
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    description:
      'A flow board mapped — Backlog → To do → In progress → Review → Done. Pair it with task nodes (press X to tick a card off) to run a lightweight personal or team workflow right on the canvas.',
    icon: '📋',
    data: makeTemplate('Kanban', [
      { label: '📥 Backlog', note: 'Everything not yet committed.', children: ['Card 1', 'Card 2', 'Card 3'] },
      { label: '📌 To do', note: 'Pulled in for this cycle.', children: ['Card 4', 'Card 5'] },
      { label: '🔨 In progress', note: 'WIP limit: keep this short.', children: ['Card 6'] },
      { label: '🔍 Review', note: 'Done-ish, awaiting check.', children: ['Card 7'] },
      { label: '✅ Done', note: 'Shipped. Tick cards off with X.', children: ['Card 8'] },
    ]),
  },
  {
    id: 'project-planning',
    name: 'Project Planning',
    description:
      'A complete five-phase project blueprint — define, design, build, launch, measure — with concrete sub-items at each stage so you can see the shape before you fill in your own.',
    icon: '🎯',
    data: makeTemplate('My Project', [
      {
        label: 'Define',
        children: [
          {
            label: 'Goals',
            children: ['Primary outcome', 'Success metric', 'Out of scope'],
          },
          {
            label: 'Scope',
            children: ['MVP cut', 'In-scope features', 'Stretch goals'],
          },
          {
            label: 'Stakeholders',
            children: ['Sponsor', 'Working team', 'Reviewers'],
          },
        ],
      },
      {
        label: 'Design',
        children: [
          {
            label: 'Approach',
            children: ['Tech choices', 'Architecture', 'Trade-offs'],
          },
          {
            label: 'Constraints',
            children: ['Time', 'Budget', 'Team capacity'],
          },
          { label: 'Open questions', children: ['Question 1', 'Question 2'] },
        ],
      },
      {
        label: 'Build',
        children: [
          {
            label: 'Tasks',
            children: ['Backlog', 'In progress', 'Done'],
          },
          {
            label: 'Milestones',
            children: ['Alpha', 'Beta', 'GA'],
          },
          {
            label: 'Dependencies',
            children: ['Internal', 'External', 'Third-party'],
          },
        ],
      },
      {
        label: 'Launch',
        children: [
          {
            label: 'Plan',
            children: ['Soft launch', 'Hard launch', 'Comms timeline'],
          },
          {
            label: 'Risks',
            children: ['Technical', 'Market', 'Team'],
          },
          {
            label: 'Communication',
            children: ['Customers', 'Internal team', 'Stakeholders'],
          },
        ],
      },
      {
        label: 'Measure',
        children: [
          { label: 'What worked', children: ['Wins to repeat'] },
          { label: 'What didn’t', children: ['Lessons learned'] },
          {
            label: 'Next steps',
            children: ['Quick wins', 'Long-term improvements'],
          },
        ],
      },
    ]),
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description:
      'A central question with seven angle-prompts around it, each pre-seeded with starter ideas so the page never feels blank when inspiration is slow.',
    icon: '💡',
    data: makeTemplate('How might we…', [
      {
        label: 'What if we did the opposite?',
        children: ['Idea 1', 'Idea 2', 'Wildly bad idea (often useful)'],
      },
      {
        label: 'Who’s already solved this?',
        children: ['Adjacent industries', 'Direct competitors', 'Historical precedent'],
      },
      {
        label: 'What does the user actually want?',
        children: ['Stated needs', 'Unstated needs', 'Jobs to be done'],
      },
      {
        label: 'What would success look like?',
        children: ['In 1 month', 'In 6 months', 'In a year'],
      },
      {
        label: 'What if we had unlimited resources?',
        children: ['The dream version', 'Then trim back to feasible'],
      },
      {
        label: 'What if we had to ship tomorrow?',
        children: ['Bare-minimum version', 'What we’d cut first'],
      },
      {
        label: 'What’s the worst possible idea?',
        children: ['(It often points at the best one)'],
      },
    ]),
  },
  {
    id: 'reading-list',
    name: 'Reading List',
    description:
      'A living reading log split by status and category — currently reading, queued, finished, fiction, non-fiction, and recommendations — with sample titles to show how it fills in.',
    icon: '📚',
    data: makeTemplate('My Reading', [
      {
        label: 'Currently reading',
        children: ['Book 1', 'Book 2'],
      },
      {
        label: 'Next up',
        children: [
          'Recommended by a friend',
          'Spotted in a bookshop',
          'Saw it cited somewhere',
        ],
      },
      {
        label: 'Just finished',
        children: ['★★★★★ — would re-read', '★★★ — worth a skim'],
      },
      {
        label: 'Want to revisit',
        children: ['Read too young', 'Read too fast', 'Read in pieces'],
      },
      {
        label: 'Fiction',
        children: ['Classics', 'Contemporary', 'Sci-fi / speculative'],
      },
      {
        label: 'Non-fiction',
        children: ['Biographies', 'Science', 'Business / craft', 'Essays'],
      },
      {
        label: 'Recommendations',
        children: ['From a friend', 'From a podcast', 'From someone smart on the internet'],
      },
    ]),
  },
  {
    id: 'decision-tree',
    name: 'Decision Tree',
    description:
      'A decision in the middle with explicit criteria, three real options each fleshed out with pros / cons / cost, plus a "do nothing" branch for the option people forget to consider.',
    icon: '⚖️',
    data: makeTemplate('My Decision', [
      {
        label: 'Criteria · what matters',
        children: [
          'Cost',
          'Time to result',
          'Risk',
          'Learning value',
          'Reversibility',
        ],
      },
      {
        label: 'Option A',
        children: [
          { label: 'Pros', children: ['Fast to start', 'Low risk', 'Familiar territory'] },
          { label: 'Cons', children: ['Limited upside', 'Easy to copy'] },
          { label: 'Cost', children: ['Time', 'Money', 'Opportunity cost'] },
        ],
      },
      {
        label: 'Option B',
        children: [
          { label: 'Pros', children: ['Big upside', 'High learning'] },
          { label: 'Cons', children: ['Slow to start', 'Hard to reverse'] },
          { label: 'Cost', children: ['Time', 'Money', 'Opportunity cost'] },
        ],
      },
      {
        label: 'Option C',
        children: [
          { label: 'Pros', children: ['Unexpected combination', 'Differentiated'] },
          { label: 'Cons', children: ['Untested', 'Harder to explain'] },
          { label: 'Cost', children: ['Time', 'Money'] },
        ],
      },
      {
        label: 'Do nothing',
        children: [
          { label: 'What stays the same' },
          {
            label: 'What gets worse',
            children: ['In 3 months', 'In a year'],
          },
        ],
      },
    ]),
  },
  {
    id: 'second-brain',
    name: 'Second Brain',
    description:
      'A personal knowledge map across six life domains — work, learning, health, relationships, ideas, finance — with two layers of structure inside each so you can drop notes straight in.',
    icon: '🧠',
    data: makeTemplate('My Knowledge', [
      {
        label: 'Work',
        children: [
          { label: 'Projects', children: ['Active', 'Backlog', 'Done this quarter'] },
          { label: 'People', children: ['Team', 'Network', '1:1 notes'] },
          { label: 'Learnings', children: ['This quarter', 'This year'] },
        ],
      },
      {
        label: 'Learning',
        children: [
          { label: 'Topics', children: ['Reading now', 'Curious about', 'Want to ignore'] },
          { label: 'Resources', children: ['Books', 'Courses', 'People to follow'] },
          { label: 'Open questions', children: ['Big ones', 'Small ones'] },
        ],
      },
      {
        label: 'Health',
        children: [
          { label: 'Routines', children: ['Daily', 'Weekly', 'Seasonal'] },
          { label: 'Goals', children: ['Short term', 'Long term'] },
          { label: 'Notes', children: ['Sleep', 'Movement', 'Food'] },
        ],
      },
      {
        label: 'Relationships',
        children: [
          { label: 'Family', children: ['Immediate', 'Extended'] },
          { label: 'Friends', children: ['Close', 'Wider circle'] },
          { label: 'Network', children: ['Mentors', 'Peers', 'People to thank'] },
        ],
      },
      {
        label: 'Ideas',
        children: [
          {
            label: 'Side projects',
            children: ['In progress', 'Maybe someday', 'Sunset / archived'],
          },
          {
            label: 'Random thoughts',
            children: ['Worth revisiting', 'Just dumping'],
          },
        ],
      },
      {
        label: 'Finance',
        children: [
          { label: 'Budget', children: ['Fixed', 'Variable'] },
          { label: 'Savings', children: ['Goals', 'Buckets'] },
          { label: 'Investments', children: ['Strategy', 'Holdings'] },
        ],
      },
    ]),
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description:
      'A meeting-shaped template with attendees, timed agenda, discussion, decisions, actions (with owner + due date), parking lot, and follow-up — ready to fill in live.',
    icon: '📝',
    data: makeTemplate('Meeting · [date]', [
      {
        label: 'Attendees',
        children: ['Present', 'Apologies', 'Notes-taker'],
      },
      {
        label: 'Agenda',
        children: [
          'Item 1 · 5 min',
          'Item 2 · 10 min',
          'Item 3 · 10 min',
          'AOB',
        ],
      },
      {
        label: 'Discussion',
        children: ['Key points', 'Open questions', 'Concerns raised'],
      },
      {
        label: 'Decisions',
        children: ['Agreed', 'Deferred', 'Rejected (and why)'],
      },
      {
        label: 'Actions',
        children: [
          'Owner · action · due [date]',
          'Owner · action · due [date]',
          'Follow up on [topic]',
        ],
      },
      {
        label: 'Parking lot',
        children: ['For next meeting', 'For another forum'],
      },
      {
        label: 'Next meeting',
        children: ['Date', 'Topics to cover', 'Pre-reads'],
      },
    ]),
  },
  {
    id: 'okrs',
    name: 'Goals & OKRs',
    description:
      'An objective with four key results, each fully decomposed into target / current / owner / actions / status, plus quarterly check-ins and a risks branch.',
    icon: '🥅',
    data: makeTemplate('My Objective', [
      {
        label: 'Key result 1',
        children: [
          'Target · number or state',
          'Current · number or state',
          'Owner',
          { label: 'Actions', children: ['This week', 'Next week'] },
          'Status · green / yellow / red',
        ],
      },
      {
        label: 'Key result 2',
        children: [
          'Target',
          'Current',
          'Owner',
          { label: 'Actions', children: ['This week', 'Next week'] },
          'Status',
        ],
      },
      {
        label: 'Key result 3',
        children: [
          'Target',
          'Current',
          'Owner',
          { label: 'Actions', children: ['This week', 'Next week'] },
          'Status',
        ],
      },
      {
        label: 'Key result 4 (optional stretch)',
        children: ['Target', 'Why this one', 'Owner', 'Status'],
      },
      {
        label: 'Check-ins',
        children: ['Week 4 review', 'Week 8 review', 'Week 12 (close-out)'],
      },
      {
        label: 'Risks & blockers',
        children: ['Known', 'Watching for', 'Mitigation'],
      },
    ]),
  },
  {
    id: 'trip',
    name: 'Trip Planning',
    description:
      'A trip-planning workspace with logistics, documents, activities, food, packing, budget, and notes — three layers deep so you can drop reservations and dish names straight in.',
    icon: '✈️',
    data: makeTemplate('My Trip', [
      {
        label: 'Logistics',
        children: [
          {
            label: 'Flights',
            children: ['Outbound · date · ref', 'Return · date · ref'],
          },
          {
            label: 'Hotels',
            children: ['Nights 1–3', 'Nights 4–7'],
          },
          {
            label: 'Transport',
            children: ['Airport ↔ hotel', 'Within city', 'Day trips'],
          },
        ],
      },
      {
        label: 'Documents',
        children: [
          'Passport · expiry',
          'Visa · if needed',
          'Travel insurance',
          'Vaccinations',
          'Local currency / card check',
        ],
      },
      {
        label: 'Activities',
        children: [
          {
            label: 'Must-do',
            children: ['Activity 1 · booked?', 'Activity 2', 'Activity 3'],
          },
          {
            label: 'If time',
            children: ['Off-the-tourist-trail option', 'Free afternoon ideas'],
          },
          {
            label: 'Backup',
            children: ['Rainy day plan', 'Tired day plan'],
          },
        ],
      },
      {
        label: 'Food',
        children: [
          { label: 'Must-try dishes', children: ['Local breakfast', 'Famous dish'] },
          {
            label: 'Restaurants',
            children: ['Lunch picks', 'Dinner picks', 'Special-occasion spot'],
          },
          { label: 'Coffee / snacks', children: ['Mornings', 'Afternoons'] },
        ],
      },
      {
        label: 'Pack',
        children: [
          {
            label: 'Essentials',
            children: ['Adapters', 'Meds', 'Tech (chargers, cables)'],
          },
          {
            label: 'Clothes',
            children: ['Day', 'Evening', 'Weather-appropriate layer'],
          },
          'Optional · nice-to-haves',
        ],
      },
      {
        label: 'Budget',
        children: [
          'Total budget',
          'Flights · planned',
          'Hotels · planned',
          'Food · daily limit',
          'Activities · planned',
          'Buffer for souvenirs',
        ],
      },
      {
        label: 'Notes',
        children: [
          'Language / phrases',
          'Tipping customs',
          'Time-zone shift',
          'Random reminders',
        ],
      },
    ]),
  },
];
