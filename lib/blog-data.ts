// Blog content. Articles are stored as author-controlled HTML strings and
// rendered with dangerouslySetInnerHTML behind the `.prose-squishy` class
// (see app/globals.css). This is the same trust model as the JSON-LD blocks
// elsewhere in the app — the content originates from us, never from users.
//
// Dates are publish dates. Newest first; the index and sitemap both read
// this order. When you add a post, add it to the TOP of the array.
//
// SCHEDULING: posts with a `date` in the future are "queued" — hidden from
// the index, sitemap, and direct URL until that date arrives. Because the
// blog routes render per-request (SSR), a queued post goes live on its date
// with no redeploy. Use `publishedPosts()` / `isPublished()` everywhere a
// list of live posts is needed — never iterate `posts` directly in the UI.

export type BlogPost = {
  slug: string;
  title: string;
  /** <meta name="description"> — keep 150-160 chars, keyword-forward. */
  description: string;
  /** ISO date, used for <time> + Article schema datePublished. */
  date: string;
  /** Human display date. */
  dateDisplay: string;
  author: string;
  category:
    | 'Mind mapping'
    | 'ADHD & focus'
    | 'Product'
    | 'Comparisons'
    | 'How-to';
  /** Rough reading time in minutes, shown on the card + post header. */
  readingMinutes: number;
  /** Alt text for the cover image. Falls back to the post title if unset. */
  coverAlt?: string;
  tags: string[];
  /** One-paragraph teaser for the index card + OG description fallback. */
  excerpt: string;
  /** Article body as HTML. Rendered inside `.prose-squishy`. */
  body: string;
};

export const posts: BlogPost[] = [
  {
    slug: 'weekly-planning-ritual-with-mind-maps',
    title: 'How to Build a Weekly Planning Ritual With Mind Maps',
    description:
      'A simple 15-minute weekly mind mapping ritual to plan your week, see your whole workload at a glance, and start Monday already knowing what matters.',
    date: '2026-08-13',
    dateDisplay: 'August 13, 2026',
    author: 'The SquishyMind Team',
    category: 'How-to',
    readingMinutes: 7,
    tags: ['planning', 'organization', 'productivity', 'weekly review'],
    excerpt:
      'Sunday-night dread usually isn’t about the work — it’s about not being able to see the work. A 15-minute weekly mind map fixes that. Here’s the ritual, step by step.',
    body: `
<p class="lead">Most weekly planning advice fails for the same reason most diets fail: it asks for more discipline than a tired human actually has on a Sunday evening. The trick isn’t more willpower. It’s a ritual short enough to survive a bad week and visual enough that it actually reduces the noise in your head. Here’s a 15-minute weekly mind map that does both.</p>

<h2>Why a map beats a list for weekly planning</h2>
<p>A weekly to-do list has a fatal flaw: it flattens everything into one anxious column where a two-minute email sits next to a three-day project, looking equally heavy. A map keeps the structure. Projects branch into tasks. Areas of your life stay visually separate. You can see the <em>shape</em> of your week — where it’s overloaded, where it’s empty, what you’re quietly avoiding — in a single glance. That visibility is the entire benefit.</p>

<h2>The 15-minute ritual</h2>
<h3>Minutes 0–3: Dump</h3>
<p>Open your weekly map (start from the Weekly Review template, or duplicate last week’s). Put the week’s dates in the centre and dump everything you know is coming — meetings, deadlines, errands, the thing you promised someone. No order. Just get it down. If you’ve got a voice agent like Squishy, talk it out and let her drop each item onto the canvas.</p>
<h3>Minutes 3–8: Cluster</h3>
<p>Group the dump into branches: Work, Personal, Health, and a small one called “Looming” for things that aren’t this week but are casting a shadow. Drag related nodes together. This is where the relief starts — the pile becomes a structure.</p>
<h3>Minutes 8–12: Prioritise visually</h3>
<p>Pick the <strong>three things</strong> that, if they happened, would make the week a success. Give them a colour. Everything else is secondary by definition — and seeing it labelled as secondary is permission to stop treating it as urgent.</p>
<h3>Minutes 12–15: Find the first action</h3>
<p>For each of your three, decide the genuine first step and note it. Not “finish the deck” — “open the deck and write the three section headers.” Monday-morning you will thank Sunday-evening you for removing the decision.</p>

<blockquote>The goal of weekly planning isn’t to control the week. It’s to walk into Monday already knowing the three things that matter — so the other forty don’t get a vote on your attention.</blockquote>

<h2>Make it stick</h2>
<p>Two rules keep a ritual alive. First, <strong>same time every week</strong> — attach it to something that already happens (Sunday coffee, Friday wind-down). Second, <strong>let it be imperfect.</strong> A rushed five-minute version on a chaotic week still beats skipping it. The streak matters more than the polish.</p>
<p>Keep last week’s map. Reviewing what you planned versus what actually happened is its own quiet lesson — you’ll learn how much you really fit in a week, which makes the next plan honest instead of aspirational.</p>

<p>Want a head start? The <a href="/features">Weekly Review template</a> is one of eight built in. <a href="/signup">Start your first weekly map free →</a> Pair it with the <a href="/blog/brain-dump-to-structure-workflow-overwhelmed-minds">brain-dump workflow</a> when a week gets genuinely overwhelming.</p>
`,
  },
  {
    slug: 'tree-view-untangle-complex-decisions',
    title: 'From Chaos to Clarity: Using Tree View to Untangle Complex Decisions',
    description:
      'How to use a mind map’s Tree View to break down hard decisions, map consequences, and see the path forward. A practical guide to decision trees.',
    date: '2026-08-06',
    dateDisplay: 'August 6, 2026',
    author: 'The SquishyMind Team',
    category: 'How-to',
    readingMinutes: 7,
    tags: ['decision making', 'tree view', 'organization', 'mind mapping'],
    excerpt:
      'Hard decisions feel impossible because you’re holding every branch in your head at once. Tree View puts them on the page, in order, where you can finally reason about them one at a time.',
    body: `
<p class="lead">A genuinely hard decision — switch jobs, kill a project, move cities — rarely feels hard because the answer is hidden. It feels hard because every possible path, consequence, and second-order effect is swirling in your head simultaneously, and your working memory simply can’t hold it all still long enough to reason. Tree View is the cure: it pins the whole decision down, in order, so you can examine one branch at a time.</p>

<h2>Why a tree, specifically</h2>
<p>Decisions are naturally hierarchical. A choice leads to outcomes; each outcome leads to further choices and consequences. That’s a tree. A flat pros-and-cons list throws away the structure — it can’t show that a particular “con” only exists if an earlier choice goes a certain way. Tree View, with its clean left-to-right hierarchy, mirrors exactly how a decision actually branches.</p>

<h2>Building the decision tree</h2>
<h3>1. Put the real question at the root</h3>
<p>Be precise. Not “my career” but “Should I take the offer from Company B?” A vague root produces a vague tree.</p>
<h3>2. Branch the genuine options</h3>
<p>Usually two or three: take it, stay, negotiate. Each becomes a top-level branch. Resist the urge to pre-judge — map them all honestly.</p>
<h3>3. Map consequences as children</h3>
<p>Under each option, branch the likely outcomes. Then go one level deeper: what does each outcome <em>lead to</em>? This second layer is where the real insight lives — it’s the stuff you can’t hold in your head, which is why the decision felt impossible.</p>
<h3>4. Mark the unknowns</h3>
<p>Some branches end in a question, not an outcome. Give those a colour. A decision often isn’t actually about choosing — it’s about resolving two or three key unknowns. The tree reveals exactly which ones.</p>

<blockquote>You don’t make a hard decision by thinking harder. You make it by getting the branches out of your head and onto a canvas, where you can finally look at one without losing the others.</blockquote>

<h2>Reading the finished tree</h2>
<p>Step back and look at the whole thing. Three things usually jump out: a branch that’s obviously thinner and scarier than you’d assumed (often the one you were avoiding), a cluster of consequences that all hinge on one unknown (go resolve that first), and — surprisingly often — the realisation that two options aren’t that different at the leaves, which means the decision matters less than your anxiety claimed.</p>
<p>Tree View also switches losslessly with Canvas, Outline, and Table — so if you want to brainstorm consequences spatially first and then straighten them into a tree, you can. Same map, different lens.</p>

<p><a href="/signup">Map your next hard decision free →</a> Start in Tree View, or read about <a href="/blog/the-4-views-of-a-mind-map">all four views and when to use each</a>.</p>
`,
  },
  {
    slug: 'science-of-why-visual-maps-stick',
    title: 'Color, Motion, and Memory: The Science Behind Why Visual Maps Stick',
    description:
      'Why do mind maps help you remember more than notes? The cognitive science of spatial memory, dual coding, and colour — and how to use it in your maps.',
    date: '2026-07-30',
    dateDisplay: 'July 30, 2026',
    author: 'The SquishyMind Team',
    category: 'Mind mapping',
    readingMinutes: 8,
    tags: ['memory', 'cognitive science', 'learning', 'mind mapping'],
    excerpt:
      'Mind maps aren’t just prettier than notes — they’re wired into how human memory actually works. Here’s the cognitive science of spatial memory, dual coding, and why colour and motion make things stick.',
    body: `
<p class="lead">People assume mind maps work because they’re “more creative” or “more visual,” as if those were vague aesthetic virtues. The real reason is more interesting and more concrete: mind maps exploit three specific, well-studied features of human memory. Understanding them tells you how to build maps that actually stick.</p>

<h2>1. Spatial memory: your oldest, strongest filing system</h2>
<p>Long before humans had language, we had to remember <em>places</em> — where the water was, where the danger lived. The brain’s machinery for spatial memory is ancient and extraordinarily robust. It’s why “memory palace” techniques work: attach information to locations and recall soars.</p>
<p>A mind map gives every idea a location. Top-left, far branch, near the red node. Those positions become retrieval handles your spatial memory grabs onto automatically. A flat list gives you none of that — every line is in the same featureless column. This is the single biggest reason maps outperform notes for recall.</p>

<h2>2. Dual coding: two memories are better than one</h2>
<p>Cognitive scientist Allan Paivio’s dual-coding theory holds that we encode information in two channels — verbal and visual — and that information stored in both is far more durable than information stored in one. A plain note is verbal-only. A mind map encodes the same content verbally (the words in the node) <em>and</em> visually (its position, its branch, its colour, its connections). You’re laying down two memory traces for the price of one.</p>

<blockquote>Notes give your brain one thread to pull on later. A map gives it several — the words, the place, the colour, the shape of the branch. When one thread frays, the others still reach the memory.</blockquote>

<h2>3. Colour and motion: attention is the gate to memory</h2>
<p>You can’t remember what you didn’t attend to, and the brain is biased to attend to colour, contrast, and movement — they signalled “important” on the savannah and they still grab the eye on a screen. This is why SquishyMind’s branches auto-colour and its nodes gently move. It isn’t decoration; it’s recruiting your attention system to mark distinctions your memory will later use. A blue branch and a pink branch are easier to keep separate in memory than two identical grey ones.</p>

<h2>How to build maps that exploit all three</h2>
<ul>
<li><strong>Spread out spatially.</strong> Don’t cram. Give distinct ideas distinct positions — the space is doing memory work.</li>
<li><strong>Let colour mean something.</strong> Use the auto-colouring, but lean into it: one colour per theme makes clusters memorable.</li>
<li><strong>Keep branch labels short.</strong> A node is a memory cue, not a paragraph. Short labels force you to encode the idea, not transcribe it.</li>
<li><strong>Rebuild from memory.</strong> The ultimate test and reinforcement: recreate the map blank. Spatial recall is trainable, and rebuilding trains it hard.</li>
</ul>

<p>None of this requires you to think about cognitive science while you work — a good tool bakes it in. But knowing <em>why</em> the colours and the space and the motion matter helps you stop treating them as frills and start using them as the memory tools they are.</p>

<p><a href="/signup">Build a map your brain will actually remember →</a> Or see the practical version for revision in <a href="/blog/how-students-use-mind-maps-to-study">how students use mind maps to study</a>.</p>
`,
  },
  {
    slug: 'whats-next-for-squishymind',
    title: 'What’s Next for SquishyMind: The Features We’re Dreaming Up',
    description:
      'A peek at the SquishyMind roadmap — the features and ideas we’re exploring next, from smarter AI to new views, and how beta feedback shapes them.',
    date: '2026-07-23',
    dateDisplay: 'July 23, 2026',
    author: 'The SquishyMind Team',
    category: 'Product',
    readingMinutes: 6,
    tags: ['roadmap', 'product', 'features', 'beta'],
    excerpt:
      'We build in the open. Here’s an honest look at the ideas we’re dreaming up next — some close, some far, some maybe-never — and how your beta feedback decides which ones become real.',
    body: `
<p class="lead">Most product roadmaps are either marketing fiction or a sacred contract the company immediately regrets signing. Ours is neither. It’s a list of things we’re genuinely excited about, ordered by rough confidence, shared openly — because the best feature ideas have always come from beta users telling us what their brains actually need. Here’s what’s on our minds.</p>

<h2>Close: things we’re actively building</h2>
<h3>Smarter Squishy</h3>
<p>Our voice agent already builds branches, reorganises maps, and expands ideas. Next we want her to reason across your <em>whole</em> map — “what am I missing here?”, “which branch is underdeveloped?”, “summarise this for my boss.” Less a command interface, more a thinking partner who’s actually read the room.</p>
<h3>Presentation mode</h3>
<p>A way to walk through a map branch-by-branch, full-screen, for sharing your thinking live. Your map is often the best version of your idea — it shouldn’t have to become a slide deck to be presentable.</p>

<h2>Middle distance: ideas we’re prototyping</h2>
<h3>A timeline view</h3>
<p>A fifth way to look at your map: laid out along time. For project plans and anything with a sequence, seeing your nodes as a timeline could be the lens that finally makes deadlines feel real.</p>
<h3>Templates that learn</h3>
<p>Right now we ship eight templates. We’d like Squishy to generate a custom starting structure from a one-sentence description, then let you save your own as reusable templates — your frameworks, not just ours.</p>

<blockquote>We’d rather ship one feature that changes how you think than ten that pad a comparison table. The roadmap is a filter for that, not a promise.</blockquote>

<h2>Far / maybe: things we’re just daydreaming about</h2>
<ul>
<li><strong>Offline-first editing</strong> — map on a plane, sync when you land.</li>
<li><strong>Deeper integrations</strong> — pull a map from your notes app, push tasks to your tracker.</li>
<li><strong>A public map gallery</strong> — discover and remix great maps other people have shared.</li>
<li><strong>Themes beyond the current four</strong> — because some of you have asked for a brain that isn’t pink, and we’re trying not to take it personally.</li>
</ul>

<h2>How this gets decided</h2>
<p>Beta feedback, mostly. Every one of these moves up or down based on what beta users tell us and what we watch them struggle with. That’s the real reason <a href="/founder-access">Founder Access</a> exists — the people here early are shaping the product, so it’s only fair they keep founder pricing for life. If something on this list is the thing that would make SquishyMind indispensable for you, tell us. We’re listening, and the brain in the corner has very good hearing.</p>

<p>Follow along on the <a href="/changelog">changelog</a>, where we ship loudly and publicly. <a href="/signup">Join the beta →</a> and help decide what comes next.</p>
`,
  },
  {
    slug: 'table-view-when-your-brainstorm-is-a-spreadsheet',
    title: 'Table View: When Your Brainstorm Is Secretly a Spreadsheet',
    description:
      'Some mind maps are really structured data in disguise. Table View gives your map rows, columns, and fast inline editing — here’s when and how to use it.',
    date: '2026-07-16',
    dateDisplay: 'July 16, 2026',
    author: 'The SquishyMind Team',
    category: 'Mind mapping',
    readingMinutes: 6,
    tags: ['table view', 'organization', 'data', 'mind mapping'],
    excerpt:
      'Not every map wants to be a sprawling canvas. Sometimes your brainstorm is secretly a list with attributes — and Table View turns it into fast, structured, editable rows without losing the map underneath.',
    body: `
<p class="lead">Here’s a thing nobody tells you about mind mapping: sometimes the map you’re building is secretly a spreadsheet. You started brainstorming features, or candidates, or content ideas — and what you actually have is a list of things, each with the same handful of attributes. Forcing that onto a sprawling canvas is fighting your own data. That’s exactly what Table View is for.</p>

<h2>The tell: when your map wants to be a table</h2>
<p>Watch for these signs in a map:</p>
<ul>
<li>Most nodes sit at the same level — it’s wide, not deep.</li>
<li>Each item has the same kind of sub-points (a status, an owner, a priority).</li>
<li>You keep wanting to compare items side by side rather than see how they branch.</li>
</ul>
<p>When a map looks like that, the Canvas is working against you and Table View is the answer. Same underlying map — every node is still a node — just shown as rows you can scan and edit fast.</p>

<h2>What Table View is good at</h2>
<h3>Fast data entry</h3>
<p>Click a cell, type, tab, repeat. When you’re entering a lot of similar items, the table’s click-to-edit flow is dramatically faster than placing and labelling nodes on a canvas one at a time.</p>
<h3>Scanning and comparing</h3>
<p>Rows align attributes into columns, and aligned columns are what the human eye compares effortlessly. Twenty candidates, each with experience and fit and a note? A table lets you scan down a column. A canvas makes you hunt.</p>
<h3>Structured collaboration</h3>
<p>When a team is filling in the same kind of information across many items, a shared table keeps everyone’s entries consistent and legible — no two people inventing different node layouts for the same thing.</p>

<blockquote>The point of four views isn’t variety for its own sake. It’s that the same idea has different natural shapes at different moments — and a tool that lets you switch shapes without losing data is a tool that never makes you fight your own structure.</blockquote>

<h2>The magic: it’s still a map</h2>
<p>The best part is that Table View isn’t a separate document. Enter your items as rows, then flip to Canvas View and they’re nodes you can branch, connect, and reorganise spatially. Build the list fast in the table, then think about it visually on the canvas. Or the reverse — brainstorm loosely on the canvas, then switch to the table to add structured attributes once the ideas settle. The data flows losslessly between every view.</p>

<p>This is why we built four views instead of insisting one layout fits everything. <a href="/signup">Try Table View free →</a> Or get the full tour in <a href="/blog/the-4-views-of-a-mind-map">the 4 views of a mind map</a>.</p>
`,
  },
  {
    slug: 'mind-mapping-for-project-management',
    title: 'Mind Mapping for Project Management: A Practical Guide',
    description:
      'How to use mind maps to plan projects, map dependencies, run kickoffs, and keep a team aligned — a practical project management guide with real workflows.',
    date: '2026-07-09',
    dateDisplay: 'July 9, 2026',
    author: 'The SquishyMind Team',
    category: 'How-to',
    readingMinutes: 8,
    tags: ['project management', 'teams', 'planning', 'organization'],
    excerpt:
      'Gantt charts are great for tracking a plan and terrible for making one. Mind maps are where the plan is born — the scope, the dependencies, the unknowns. Here’s how to run a project from a map.',
    body: `
<p class="lead">Project management tools are mostly built for <em>tracking</em> a plan that already exists — boards, Gantt charts, burndown. But the hardest, most valuable part of a project happens before any of that: figuring out the shape of the work in the first place. That’s thinking, and thinking happens best on a map. Here’s how to use mind mapping across a project’s life.</p>

<h2>Phase 1: Scoping (the map earns its keep here)</h2>
<p>At the start, you don’t have a task list — you have a fog. Put the project goal at the centre and branch out the major workstreams. Under each, branch the tasks you can see. The visual structure immediately exposes two things a list would hide: which workstream is suspiciously thin (you haven’t thought it through), and which tasks connect across workstreams (your dependencies).</p>

<h2>Phase 2: Dependencies and risk</h2>
<p>Now use cross-links. Draw connections between nodes in different branches that depend on each other. A map makes dependencies <em>visible</em> as lines, where a task list buries them in prose nobody reads. Then mark the unknowns and risks in a distinct colour. A glance at the finished map tells you where the project is most likely to slip: the heavily-connected node everything waits on, and the red cluster of things you don’t yet know.</p>

<blockquote>A Gantt chart shows you the plan you committed to. A mind map is where you figure out whether that plan makes any sense in the first place. Do the map before you draw the chart.</blockquote>

<h2>Phase 3: The kickoff</h2>
<p>Walk the team through the map live, in <a href="/features">real-time collaboration</a>. Everyone sees the whole project at once — the workstreams, the dependencies, the risks — instead of a flat backlog with no context. Let people add nodes for things you missed; cursors and live edits mean a kickoff becomes a working session, not a one-way briefing. By the end, the team shares a mental model, not just a task list.</p>

<h2>Phase 4: Living reference</h2>
<p>Keep the map as the project’s “big picture” home, even after the tasks move into your tracker. When someone asks “why are we doing this?” or “how does my piece fit?”, the map answers in one screen. Use Table View when you need to assign owners and statuses across many tasks; flip to Canvas when you need to re-explain the shape. Update it at each milestone — a project map that stays current is the cheapest alignment tool a team has.</p>

<h2>A quick template to steal</h2>
<ul>
<li><strong>Centre:</strong> the project goal, in one sentence.</li>
<li><strong>Level 1:</strong> workstreams (Design, Build, Launch, etc.).</li>
<li><strong>Level 2:</strong> tasks under each.</li>
<li><strong>Cross-links:</strong> dependencies between tasks.</li>
<li><strong>Colour:</strong> one for risks/unknowns, one for the critical path.</li>
</ul>

<p>The Project Plan template gives you this structure pre-built. <a href="/signup">Plan your next project free →</a> Or see how product teams specifically use it on the <a href="/use-cases">use cases page</a>.</p>
`,
  },
  {
    slug: 'why-playful-software-makes-you-more-productive',
    title: 'Why Playful Software Makes You More Productive, Not Less',
    description:
      'Fun in a tool isn’t a distraction from productivity — it’s a driver of it. The psychology of play, flow, and why a delightful app gets more real work done.',
    date: '2026-07-02',
    dateDisplay: 'July 2, 2026',
    author: 'The SquishyMind Team',
    category: 'Product',
    readingMinutes: 6,
    tags: ['design', 'productivity', 'play', 'flow'],
    excerpt:
      'There’s a stubborn belief that serious work requires serious-looking tools. The psychology says the opposite: play lowers the stakes, play sustains attention, and play is where your best thinking actually happens.',
    body: `
<p class="lead">There’s a quiet puritanism in productivity culture: the belief that if a tool looks fun, it must not be serious — that real work demands grey, grim, frictional software, and anything delightful is a distraction in disguise. It’s a tidy story. It’s also wrong, and the psychology of how people actually think and create says so.</p>

<h2>Play lowers the stakes of starting</h2>
<p>The hardest part of any creative or cognitive task is the blank page — the moment before you’ve committed anything, when everything you might do feels judged in advance. Playful tools defuse that. When the canvas wobbles a little, when there’s a friendly brain in the corner, when nothing about the interface feels like an exam, you put the first messy idea down sooner. And the first messy idea is the unlock for all the rest.</p>

<h2>Play sustains attention</h2>
<p>Attention isn’t infinite willpower; it’s heavily modulated by interest. Novelty, responsiveness, small moments of surprise — these keep the brain engaged, which is precisely why monotonous tools quietly drain you and you drift to a browser tab. A tool with personality holds attention longer, and attention is the raw material of every productive session. This is doubly true for anyone whose focus runs on interest rather than discipline — see our piece on <a href="/blog/mind-mapping-for-adhd">mind mapping for ADHD</a>.</p>

<blockquote>Seriousness is about what you’re trying to accomplish, not about how grim your tools look while you do it. The most productive state — flow — is literally described as feeling like play.</blockquote>

<h2>Flow feels like play because it is</h2>
<p>The most productive mental state we know of — flow, the deep, time-disappears absorption where your best work happens — is characterised by researchers in language that’s indistinguishable from play: intrinsic enjoyment, loss of self-consciousness, the activity feeling rewarding in itself. Tools that feel like play are tools that make flow easier to reach. Tools that feel like a chore push you the other way, into the shallow, effortful, easily-interrupted attention where little of value gets made.</p>

<h2>The honest caveat</h2>
<p>This isn’t a licence for gimmicks. Play that gets in the way of the work — confetti you have to dismiss, animations that slow you down — is just friction wearing a fun hat. The goal is delight that <em>serves</em> the work: motion that draws your eye to what matters, personality that makes a powerful feature approachable, responsiveness that keeps you in flow. Fun as a feature, not fun as a distraction.</p>
<p>That’s the line we try to walk with SquishyMind. The brain is charming so you’ll actually use the voice agent. The nodes move so your eye tracks structure. It’s playful on purpose, in service of getting more real thinking done — which is the whole point, and the opposite of frivolous.</p>

<p>We wrote more about the philosophy in <a href="/blog/why-we-made-mind-mapping-fun">why we made mind mapping fun</a>. Or just <a href="/signup">come feel the difference →</a> — it’s free during beta.</p>
`,
  },
  {
    slug: 'outline-view-vs-canvas-view',
    title: 'Outline View vs Canvas View: Two Brains, One Map',
    description:
      'Canvas View and Outline View show the same mind map two ways — spatial and linear. Here’s when each one wins and how switching between them sharpens your thinking.',
    date: '2026-06-25',
    dateDisplay: 'June 25, 2026',
    author: 'The SquishyMind Team',
    category: 'Mind mapping',
    readingMinutes: 6,
    tags: ['outline view', 'canvas view', 'views', 'mind mapping'],
    excerpt:
      'The same map can be a sprawling spatial canvas or a tidy collapsible outline. They’re not rivals — they’re two lenses on one structure, and knowing when to switch is a thinking skill in itself.',
    body: `
<p class="lead">Canvas and Outline are the two views people reach for most, and they feel almost opposite: one sprawls across infinite space, the other stacks into a neat vertical list. It’s tempting to pick a favourite and stay there. Don’t. They’re two lenses on the same structure, each strong exactly where the other is weak, and the real skill is knowing when to flip.</p>

<h2>Canvas View: thinking in space</h2>
<p>The Canvas is where ideas are born. Spatial layout engages your spatial memory, lets you cluster related thoughts physically, and shows relationships — including cross-branch connections — as visible lines. It’s expansive and forgiving, which is exactly what early, messy thinking needs.</p>
<p><strong>Canvas wins when:</strong> you’re brainstorming, the structure isn’t settled yet, relationships matter more than sequence, or you’re a visual thinker who needs to <em>see</em> the shape of an idea to hold it.</p>

<h2>Outline View: thinking in sequence</h2>
<p>The Outline is where ideas get disciplined. The same nodes become a collapsible, indented hierarchy — clean, linear, scannable. Collapse a branch to hide detail; expand it to dive in. It’s how a document wants to be structured, and it’s far easier to read top-to-bottom than a busy canvas.</p>
<p><strong>Outline wins when:</strong> the structure has stabilised, you’re turning a map into writing, you need to share it as a readable document, or the content is genuinely hierarchical (a table of contents, a spec, a nested plan).</p>

<blockquote>Canvas is for divergence — getting ideas out and seeing how they relate. Outline is for convergence — tightening them into a sequence you can act on or write down. Most good thinking needs both, in that order.</blockquote>

<h2>The workflow that uses both</h2>
<p>Here’s the move that makes the two views more than the sum of their parts: <strong>diverge on the Canvas, converge in the Outline.</strong></p>
<ul>
<li>Start on the Canvas. Dump, cluster, connect. Let it be messy and spatial.</li>
<li>When the shape settles, flip to Outline. Suddenly you see the linear order, spot the gaps, and notice the branch that’s three levels deep when it should be one.</li>
<li>Found a problem? Flip back to Canvas to rearrange spatially, then return to Outline to check the new sequence.</li>
</ul>
<p>Because both views render the same underlying map with zero data loss, switching costs you nothing and reveals something every time. A branch that looked balanced on the canvas can look bloated in the outline — and vice versa. The friction-free flip is itself a thinking tool.</p>

<h2>Don’t forget the other two</h2>
<p>Canvas and Outline are the headline act, but Tree View (clean hierarchy, great for decisions) and Table View (rows and attributes, great for structured data) round out the set. We cover all four in <a href="/blog/the-4-views-of-a-mind-map">the 4 views of a mind map</a>.</p>

<p><a href="/signup">Try switching views on your own map free →</a> The flip is one click, and it changes what you see every time.</p>
`,
  },
  {
    slug: 'organize-your-digital-life-with-one-mind-map',
    title: 'How to Organize Your Entire Digital Life With One Mind Map',
    description:
      'Scattered notes, tabs, and to-dos across a dozen apps? Build one master mind map as the home base for your digital life. A practical organization guide.',
    date: '2026-06-18',
    dateDisplay: 'June 18, 2026',
    author: 'The SquishyMind Team',
    category: 'How-to',
    readingMinutes: 7,
    tags: ['organization', 'second brain', 'productivity', 'PARA'],
    excerpt:
      'Your digital life is scattered across a dozen apps, and the chaos has a cost you’ve stopped noticing. One master mind map — a home base, not another silo — can pull it back together. Here’s how to build it.',
    body: `
<p class="lead">Count the places your important stuff currently lives: notes app, three project tools, browser bookmarks, a chaotic desktop, your own memory doing more work than it should. Each one is a silo, and the cost isn’t just lost files — it’s the low background hum of never quite knowing where anything is or what you’re forgetting. One master mind map can quiet that hum. Not by replacing your apps, but by sitting above them as a single map of the whole territory.</p>

<h2>The principle: a map, not another silo</h2>
<p>The mistake people make is trying to move <em>everything</em> into one tool. That just creates a thirteenth silo. The goal instead is a single overview map — your personal home base — that shows the structure of your digital life and points to where things actually live. It’s the index, not the warehouse.</p>

<h2>Step 1: Map your areas, not your tasks</h2>
<p>Start broad. Branch your life into its major areas: Work, Side Project, Home, Health, Learning, Finances — whatever yours are. Resist dropping to task-level detail. This top layer is the skeleton, and getting it right is most of the value. A clean set of areas you recognise instantly is the thing you’ve been missing.</p>

<h2>Step 2: Borrow PARA for the next layer</h2>
<p>Under each area, the PARA method (Projects, Areas, Resources, Archives) is a battle-tested structure:</p>
<ul>
<li><strong>Projects</strong> — things with an end (ship the redesign, plan the trip).</li>
<li><strong>Areas</strong> — ongoing responsibilities with no end (health, finances).</li>
<li><strong>Resources</strong> — references you return to (that doc, that link, that login).</li>
<li><strong>Archives</strong> — done and dormant, kept just in case.</li>
</ul>
<p>You don’t have to be rigid about it. The point is a consistent shape so that every part of your life is organised the same way and your brain stops having to re-learn the layout each time.</p>

<h2>Step 3: Link out, don’t copy in</h2>
<p>For each node, add a note pointing to where the real thing lives — the project tool, the doc URL, the folder. The map tells you <em>what exists and where</em>; the apps hold the contents. This is the discipline that keeps the map from rotting into yet another stale silo.</p>

<blockquote>You don’t need everything in one place. You need one place that knows where everything is. That’s the difference between a silo and a home base.</blockquote>

<h2>Step 4: Make it the first thing you open</h2>
<p>An overview map only works if you actually look at it. Make it your start-of-day glance: open the map, see the whole territory, notice what needs attention today. Five seconds of orientation beats five minutes of app-hopping trying to remember what you were even doing.</p>

<h2>Keeping it alive</h2>
<p>Once a week — pair it with your <a href="/blog/weekly-planning-ritual-with-mind-maps">weekly planning ritual</a> — prune it. Move finished projects to Archives, add new ones, fix dead links. A home base needs light, regular upkeep, not a quarterly heroic reorganisation. The Second Brain template gives you this whole structure pre-built.</p>

<p><a href="/signup">Build your home-base map free →</a> Start from the Second Brain template and adapt it to your life.</p>
`,
  },
  {
    slug: 'the-4-views-of-a-mind-map',
    title: 'The 4 Views of a Mind Map: When to Use Canvas, Outline, Tree, or Table',
    description:
      'Canvas, Outline, Tree, and Table — four ways to see the same mind map. A complete guide to what each view is best at and when to switch between them.',
    date: '2026-06-11',
    dateDisplay: 'June 11, 2026',
    author: 'The SquishyMind Team',
    category: 'Mind mapping',
    readingMinutes: 7,
    tags: ['views', 'canvas', 'outline', 'tree', 'table', 'mind mapping'],
    excerpt:
      'The same idea has different natural shapes at different moments. SquishyMind gives you four views of one map — Canvas, Outline, Tree, and Table — and the real skill is knowing which lens fits the moment.',
    body: `
<p class="lead">Most mind mapping tools give you one way to look at a map: a canvas. But a single idea rarely has a single natural shape. Brainstorming wants space; revision wants a list; a decision wants a tree; structured data wants rows. SquishyMind shows the same map four ways — Canvas, Outline, Tree, and Table — with zero data loss when you switch. Here’s a complete guide to picking the right lens.</p>

<figure>
<svg viewBox="0 0 680 320" width="100%" role="img" xmlns="http://www.w3.org/2000/svg">
  <title>The four SquishyMind view modes: Canvas, Outline, Tree, and Table</title>
  <defs>
    <filter id="glow-v" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-c" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-p" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-a" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Panel 1: Canvas (violet) -->
  <rect x="10" y="10" width="155" height="300" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <!-- label -->
  <text x="87" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#e8eaff" letter-spacing="0.5">Canvas</text>
  <!-- central node -->
  <circle cx="87" cy="140" r="16" fill="#8b5cf6" fill-opacity="0.25" stroke="#8b5cf6" stroke-width="1.5" filter="url(#glow-v)"/>
  <circle cx="87" cy="140" r="6" fill="#8b5cf6"/>
  <!-- satellite nodes -->
  <circle cx="42" cy="100" r="9" fill="#8b5cf6" fill-opacity="0.2" stroke="#8b5cf6" stroke-width="1.2"/>
  <circle cx="42" cy="100" r="4" fill="#8b5cf6" fill-opacity="0.8"/>
  <circle cx="135" cy="95" r="7" fill="#8b5cf6" fill-opacity="0.2" stroke="#8b5cf6" stroke-width="1.2"/>
  <circle cx="135" cy="95" r="3.5" fill="#8b5cf6" fill-opacity="0.8"/>
  <circle cx="130" cy="185" r="10" fill="#8b5cf6" fill-opacity="0.2" stroke="#8b5cf6" stroke-width="1.2"/>
  <circle cx="130" cy="185" r="4.5" fill="#8b5cf6" fill-opacity="0.8"/>
  <circle cx="44" cy="190" r="7" fill="#8b5cf6" fill-opacity="0.2" stroke="#8b5cf6" stroke-width="1.2"/>
  <circle cx="44" cy="190" r="3.5" fill="#8b5cf6" fill-opacity="0.8"/>
  <circle cx="87" cy="230" r="8" fill="#8b5cf6" fill-opacity="0.2" stroke="#8b5cf6" stroke-width="1.2"/>
  <circle cx="87" cy="230" r="3.5" fill="#8b5cf6" fill-opacity="0.8"/>
  <!-- curved connectors -->
  <path d="M75 127 Q55 112 50 108" stroke="#8b5cf6" stroke-width="1" fill="none" stroke-opacity="0.6"/>
  <path d="M100 128 Q120 108 128 100" stroke="#8b5cf6" stroke-width="1" fill="none" stroke-opacity="0.6"/>
  <path d="M100 152 Q118 170 122 179" stroke="#8b5cf6" stroke-width="1" fill="none" stroke-opacity="0.6"/>
  <path d="M73 152 Q57 173 50 185" stroke="#8b5cf6" stroke-width="1" fill="none" stroke-opacity="0.6"/>
  <path d="M87 156 Q87 195 87 222" stroke="#8b5cf6" stroke-width="1" fill="none" stroke-opacity="0.6"/>
  <!-- cross-link -->
  <path d="M52 107 Q92 70 128 92" stroke="#8b5cf6" stroke-width="0.8" fill="none" stroke-opacity="0.3" stroke-dasharray="3 3"/>
  <text x="87" y="285" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="rgba(232,234,255,0.5)">Free-form spatial</text>

  <!-- Panel 2: Outline (cyan) -->
  <rect x="175" y="10" width="155" height="300" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <text x="252" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#e8eaff" letter-spacing="0.5">Outline</text>
  <!-- indent lines level 1 -->
  <rect x="198" y="60" width="112" height="8" rx="4" fill="#06b6d4" fill-opacity="0.9"/>
  <!-- level 2 -->
  <rect x="215" y="84" width="88" height="7" rx="3.5" fill="#06b6d4" fill-opacity="0.6"/>
  <rect x="215" y="100" width="72" height="7" rx="3.5" fill="#06b6d4" fill-opacity="0.6"/>
  <rect x="215" y="116" width="94" height="7" rx="3.5" fill="#06b6d4" fill-opacity="0.6"/>
  <!-- level 3 under last l2 -->
  <rect x="230" y="136" width="60" height="6" rx="3" fill="#06b6d4" fill-opacity="0.4"/>
  <rect x="230" y="150" width="50" height="6" rx="3" fill="#06b6d4" fill-opacity="0.4"/>
  <!-- level 1 again -->
  <rect x="198" y="174" width="98" height="8" rx="4" fill="#06b6d4" fill-opacity="0.9"/>
  <rect x="215" y="196" width="76" height="7" rx="3.5" fill="#06b6d4" fill-opacity="0.6"/>
  <rect x="215" y="212" width="88" height="7" rx="3.5" fill="#06b6d4" fill-opacity="0.6"/>
  <!-- indent guides -->
  <line x1="210" y1="80" x2="210" y2="162" stroke="#06b6d4" stroke-width="1" stroke-opacity="0.25"/>
  <line x1="226" y1="132" x2="226" y2="162" stroke="#06b6d4" stroke-width="1" stroke-opacity="0.2"/>
  <line x1="210" y1="192" x2="210" y2="224" stroke="#06b6d4" stroke-width="1" stroke-opacity="0.25"/>
  <text x="252" y="285" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="rgba(232,234,255,0.5)">Collapsible list</text>

  <!-- Panel 3: Tree (pink) -->
  <rect x="340" y="10" width="155" height="300" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <text x="417" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#e8eaff" letter-spacing="0.5">Tree</text>
  <!-- root -->
  <rect x="353" y="120" width="36" height="24" rx="6" fill="#ec4899" fill-opacity="0.25" stroke="#ec4899" stroke-width="1.5" filter="url(#glow-p)"/>
  <rect x="361" y="129" width="20" height="6" rx="3" fill="#ec4899" fill-opacity="0.8"/>
  <!-- level 2 nodes -->
  <rect x="403" y="88" width="36" height="22" rx="6" fill="#ec4899" fill-opacity="0.18" stroke="#ec4899" stroke-width="1.2"/>
  <rect x="411" y="97" width="20" height="6" rx="3" fill="#ec4899" fill-opacity="0.7"/>
  <rect x="403" y="132" width="36" height="22" rx="6" fill="#ec4899" fill-opacity="0.18" stroke="#ec4899" stroke-width="1.2"/>
  <rect x="411" y="141" width="20" height="6" rx="3" fill="#ec4899" fill-opacity="0.7"/>
  <rect x="403" y="176" width="36" height="22" rx="6" fill="#ec4899" fill-opacity="0.18" stroke="#ec4899" stroke-width="1.2"/>
  <rect x="411" y="185" width="20" height="6" rx="3" fill="#ec4899" fill-opacity="0.7"/>
  <!-- level 3 nodes (off first l2) -->
  <rect x="453" y="76" width="30" height="18" rx="5" fill="#ec4899" fill-opacity="0.12" stroke="#ec4899" stroke-width="1"/>
  <rect x="460" y="83" width="16" height="5" rx="2.5" fill="#ec4899" fill-opacity="0.6"/>
  <rect x="453" y="100" width="30" height="18" rx="5" fill="#ec4899" fill-opacity="0.12" stroke="#ec4899" stroke-width="1"/>
  <rect x="460" y="107" width="16" height="5" rx="2.5" fill="#ec4899" fill-opacity="0.6"/>
  <!-- connectors root -> l2 -->
  <path d="M389 132 Q400 132 403 99" stroke="#ec4899" stroke-width="1" fill="none" stroke-opacity="0.5"/>
  <line x1="389" y1="132" x2="403" y2="143" stroke="#ec4899" stroke-width="1" stroke-opacity="0.5"/>
  <path d="M389 132 Q400 132 403 187" stroke="#ec4899" stroke-width="1" fill="none" stroke-opacity="0.5"/>
  <!-- connectors l2 -> l3 -->
  <line x1="439" y1="99" x2="453" y2="85" stroke="#ec4899" stroke-width="0.8" stroke-opacity="0.4"/>
  <line x1="439" y1="99" x2="453" y2="109" stroke="#ec4899" stroke-width="0.8" stroke-opacity="0.4"/>
  <text x="417" y="285" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="rgba(232,234,255,0.5)">Left-to-right hierarchy</text>

  <!-- Panel 4: Table (amber) -->
  <rect x="515" y="10" width="155" height="300" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <text x="592" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#e8eaff" letter-spacing="0.5">Table</text>
  <!-- header row -->
  <rect x="532" y="56" width="116" height="20" rx="4" fill="#f59e0b" fill-opacity="0.22" stroke="#f59e0b" stroke-width="1"/>
  <line x1="572" y1="56" x2="572" y2="76" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.4"/>
  <line x1="614" y1="56" x2="614" y2="76" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.4"/>
  <rect x="535" y="62" width="30" height="6" rx="3" fill="#f59e0b" fill-opacity="0.7"/>
  <rect x="576" y="62" width="30" height="6" rx="3" fill="#f59e0b" fill-opacity="0.7"/>
  <rect x="618" y="62" width="24" height="6" rx="3" fill="#f59e0b" fill-opacity="0.7"/>
  <!-- data rows -->
  <rect x="532" y="82" width="116" height="18" rx="3" fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.15)" stroke-width="0.5"/>
  <line x1="572" y1="82" x2="572" y2="100" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.25"/>
  <line x1="614" y1="82" x2="614" y2="100" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.25"/>
  <rect x="535" y="88" width="28" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>
  <rect x="576" y="88" width="22" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>
  <rect x="618" y="88" width="18" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>

  <rect x="532" y="104" width="116" height="18" rx="3" fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.15)" stroke-width="0.5"/>
  <line x1="572" y1="104" x2="572" y2="122" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.25"/>
  <line x1="614" y1="104" x2="614" y2="122" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.25"/>
  <rect x="535" y="110" width="22" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>
  <rect x="576" y="110" width="30" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>
  <rect x="618" y="110" width="20" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>

  <rect x="532" y="126" width="116" height="18" rx="3" fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.15)" stroke-width="0.5"/>
  <line x1="572" y1="126" x2="572" y2="144" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.25"/>
  <line x1="614" y1="126" x2="614" y2="144" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.25"/>
  <rect x="535" y="132" width="32" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>
  <rect x="576" y="132" width="18" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>
  <rect x="618" y="132" width="26" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>

  <rect x="532" y="148" width="116" height="18" rx="3" fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.15)" stroke-width="0.5"/>
  <line x1="572" y1="148" x2="572" y2="166" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.25"/>
  <line x1="614" y1="148" x2="614" y2="166" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.25"/>
  <rect x="535" y="154" width="26" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>
  <rect x="576" y="154" width="24" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>
  <rect x="618" y="154" width="22" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>

  <rect x="532" y="170" width="116" height="18" rx="3" fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.15)" stroke-width="0.5"/>
  <line x1="572" y1="170" x2="572" y2="188" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.25"/>
  <line x1="614" y1="170" x2="614" y2="188" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.25"/>
  <rect x="535" y="176" width="20" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>
  <rect x="576" y="176" width="28" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>
  <rect x="618" y="176" width="16" height="5" rx="2.5" fill="#f59e0b" fill-opacity="0.4"/>

  <text x="592" y="285" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="rgba(232,234,255,0.5)">Rows and columns</text>
</svg>
<figcaption>The same map, four ways — switch with one click.</figcaption>
</figure>

<h2>Canvas View — for thinking in space</h2>
<p>The default, free-form spatial layout. Nodes live anywhere; branches sprawl; cross-connections show as lines. It engages spatial memory and is forgiving of mess, which makes it the home of early, generative thinking.</p>
<p><strong>Use it for:</strong> brainstorming, unsettled structure, visual thinking, anything where <em>relationships</em> matter more than order.</p>

<h2>Outline View — for thinking in sequence</h2>
<p>The same map as a clean, collapsible, indented list. Linear, scannable, document-shaped. Collapse branches to see the big picture; expand to dive in.</p>
<p><strong>Use it for:</strong> turning a map into writing, sharing as a readable doc, genuinely hierarchical content, tightening a settled structure. (We go deep on the Canvas/Outline pairing in <a href="/blog/outline-view-vs-canvas-view">two brains, one map</a>.)</p>

<h2>Tree View — for hierarchy and decisions</h2>
<p>A clean left-to-right hierarchical layout. Where Canvas is loose and Outline is vertical, Tree is structured and horizontal — ideal when the parent-child structure <em>is</em> the point.</p>
<p><strong>Use it for:</strong> decision trees, org charts, technical architecture, anything where you need to trace branches cleanly. (See <a href="/blog/tree-view-untangle-complex-decisions">using Tree View to untangle complex decisions</a>.)</p>

<h2>Table View — for structured data</h2>
<p>Your map as rows with fast inline editing. When most nodes sit at the same level and share the same attributes, your map is secretly a table — and this view makes entry and comparison effortless.</p>
<p><strong>Use it for:</strong> lists of items with shared attributes, fast data entry, side-by-side comparison. (More in <a href="/blog/table-view-when-your-brainstorm-is-a-spreadsheet">when your brainstorm is secretly a spreadsheet</a>.)</p>

<blockquote>The four views aren’t four features. They’re one map seen through four lenses — and switching lens is one of the cheapest, most powerful thinking moves available to you.</blockquote>

<h2>The meta-skill: switching</h2>
<p>The real power isn’t any single view — it’s that they’re the same data, so flipping costs nothing and reveals something each time. A common high-leverage flow:</p>
<ul>
<li><strong>Canvas</strong> to brainstorm and cluster.</li>
<li><strong>Tree</strong> or <strong>Outline</strong> to impose structure once ideas settle.</li>
<li><strong>Table</strong> to add attributes and compare items.</li>
<li>Back to <strong>Canvas</strong> whenever you need to rethink the shape.</li>
</ul>
<p>A branch that looks fine in one view often looks wrong in another — too deep, too thin, out of order. The friction-free switch turns that mismatch into insight. One map, four perspectives, no copying anything anywhere.</p>

<p><a href="/signup">Try all four views on one map — free →</a> The switcher is one click, and it’ll change how you see your own thinking.</p>
`,
  },
  {
    slug: 'brain-dump-to-structure-workflow-overwhelmed-minds',
    title: 'From Brain Dump to Structure: A Mind Mapping Workflow for Overwhelmed Minds',
    description:
      'A step-by-step mind mapping workflow for when your head is too full to think straight. Dump first, organise later — built for ADHD and overwhelm.',
    date: '2026-05-28',
    dateDisplay: 'May 28, 2026',
    author: 'The SquishyMind Team',
    category: 'How-to',
    readingMinutes: 8,
    tags: ['workflow', 'adhd', 'productivity', 'mind mapping'],
    excerpt:
      'When everything feels urgent and nothing feels doable, the problem usually isn’t your to-do list — it’s that everything is still trapped in your head. Here’s a four-stage mind mapping workflow that gets it out and into a shape you can act on.',
    body: `
<p class="lead">There’s a specific kind of stuck that has nothing to do with laziness. Your head is so full that you can’t tell what matters. Every task feels equally urgent and equally impossible. You open a blank to-do list and immediately close it, because a list assumes you already know the order — and you don’t. You don’t even know the items yet.</p>

<p>This is the moment mind mapping was built for. Not the tidy, colour-coded maps you see in productivity screenshots — those are the <em>output</em>. We’re talking about the messy, honest first pass. The brain dump. Here’s a workflow that takes you from “everything at once” to “one clear next thing,” in four stages.</p>

<h2>Stage 1: Dump everything, judge nothing</h2>
<p>Open a fresh map and put a single node in the middle. Don’t overthink it — “Right now” or “My head” works fine. Then start firing off every loose thought as a child node. Tasks, worries, half-ideas, that email you’ve been avoiding, the thing you keep meaning to Google. No order. No categories yet. No editing.</p>
<p>The rule for this stage is the only rule that matters: <strong>get it out of your head and onto the canvas as fast as you can think it.</strong> If you stop to organise, you’ll lose the next three thoughts. This is where a voice assistant earns its keep — in SquishyMind you can just talk, and Squishy drops each thing onto the map while you keep talking. No typing, no context-switching, no friction between thought and capture.</p>
<blockquote>The single biggest predictor of whether a brain dump works is whether you let it be ugly. A judged brain dump is just anxiety with extra steps.</blockquote>

<h2>Stage 2: Cluster what’s alike</h2>
<p>Now — and only now — you look at the pile. You’ll start seeing groups. Three of these nodes are really about the same project. Two are errands. One is actually a feeling, not a task, and that’s worth knowing too.</p>
<p>Drag the related nodes together. In a mind map this is a physical act, not a mental one, and that difference matters for an overwhelmed brain: you’re using your hands and your eyes, not just churning in your head. Group by whatever feels natural — project, energy level, deadline, location. There’s no correct taxonomy. There’s only the one that makes <em>your</em> next step obvious.</p>

<h2>Stage 3: Find the one thread to pull</h2>
<p>Overwhelm lies to you. It says everything is connected and nothing can move until everything moves. Your clustered map quietly disproves this. Look at it and ask: <strong>which single branch, if it got moving, would make the others quieter?</strong></p>
<p>Sometimes it’s the scariest one. Sometimes it’s the smallest. Often it’s the one you’ve been avoiding, which is exactly why it’s been generating background noise. Mark it. Give it a colour. This is your thread.</p>

<h2>Stage 4: Break the thread into a next action</h2>
<p>Take that one branch and expand only it. What’s the genuinely first physical action? Not “deal with taxes” — that’s a project, not an action. “Open the folder where last year’s return is” — that’s an action. If a node still feels heavy, it’s not small enough yet. Keep breaking it down until the next step is something you could do in the next ten minutes without dread.</p>
<p>This is where SquishyMind’s AI text expansion is genuinely useful: select a vague node, ask Squishy to break it into steps, and you get a first-draft decomposition you can edit. You don’t have to generate the structure from a standing start, which for an overwhelmed brain is half the battle.</p>

<h2>Why this works (and why a list doesn’t)</h2>
<p>A linear to-do list asks you to make every decision — what’s on it, what order, what matters — simultaneously and invisibly. A mind map lets you make those decisions one stage at a time, out loud, with your hands, and crucially <em>lets you see the whole shape</em> while you do it. For brains that struggle with working memory and prioritisation — which is most of us under stress, and reliably the case with ADHD — externalising the shape is the entire game.</p>
<p>You don’t need to do this perfectly. You need to do it ugly, fast, and finished. The clean map can come later, if it comes at all. The point was never the map. The point was getting the next ten minutes back.</p>

<p><a href="/signup">Try the workflow free →</a> — open a map, and either start typing or just click the brain in the corner and talk.</p>
`,
  },

  {
    slug: 'why-we-made-mind-mapping-fun',
    title: 'Why We Made Our Mind Mapping App Fun (And Why That’s Not Frivolous)',
    description:
      'Most mind mapping tools feel like spreadsheets with extra steps. We made SquishyMind wobble, breathe, and talk back — here’s the real reason why.',
    date: '2026-05-12',
    dateDisplay: 'May 12, 2026',
    author: 'The SquishyMind Team',
    category: 'Product',
    readingMinutes: 6,
    tags: ['design', 'product', 'mind mapping', 'delight'],
    excerpt:
      'A wobbling node is not a serious feature. Except it turns out that the feeling a tool gives you is the single biggest factor in whether you actually open it again. Here’s why we spent real engineering effort making a mind map feel alive.',
    body: `
<p class="lead">Here’s a confession that should probably worry our investors: we spent a genuinely unreasonable amount of time making the nodes wobble.</p>

<p>Not function. Wobble. Every node in SquishyMind breathes slightly. Edges wiggle. The brain in the corner pulses and, if you click it, makes a small sound. None of this helps you map an idea faster in any measurable way. So why does a serious product spend serious engineering hours on it?</p>

<h2>Because the tool you don’t open is worthless</h2>
<p>The most powerful productivity tool in the world is useless if it makes you feel slightly tired every time you look at it. And most mind mapping software — if we’re honest — makes you feel like you’re filing a form. Grey toolbars. Right-angle connectors. A general air of “this was built by people optimising for an enterprise procurement checklist, not for you.”</p>
<p>That feeling has a cost. It’s the reason your last three productivity apps are gathering dust. The honest metric for a thinking tool isn’t features-per-dollar; it’s <strong>whether you come back to it on a Tuesday when no one’s making you.</strong> Delight is what gets you back. Delight is retention. Delight, it turns out, is deadly serious.</p>

<blockquote>A wobbling node is a tiny promise: this is a place where thinking can be a little bit fun. Tiny promises, kept repeatedly, are how a tool becomes a habit.</blockquote>

<h2>The brain in the corner isn’t a gimmick</h2>
<p>Squishy — our slightly sentient pink brain — reads, at first glance, like a mascot. But she’s the most functional thing on the page. She’ll build branches for you, reorganise your map, summarise your structure, argue with a bad idea. The personality isn’t decoration on top of the capability; the personality is <em>how the capability becomes approachable.</em> People who would never type into a command palette will happily talk to a brain. We didn’t make her charming to be cute. We made her charming so you’d use her.</p>

<h2>Fun is how hard things stay easy</h2>
<p>Mind mapping is, fundamentally, the act of externalising messy thought. That’s vulnerable. It’s the part of work where you don’t yet know the answer. A tool that feels cold and judgmental makes that harder. A tool that feels playful — forgiving, a little silly, clearly not going to grade you — lowers the stakes of putting a half-formed idea on the screen. And half-formed ideas, put on the screen, are where the good stuff comes from.</p>

<h2>So, the comparison nobody asked for</h2>
<p>You can map your ideas in plenty of capable, grey, professional tools. Miro is powerful. MindMeister is established. Obsidian is a fortress of local-first control. We respect all of them, and we wrote an <a href="/compare">honest comparison</a> if you want the feature-by-feature breakdown.</p>
<p>But none of them wobble. None of them have a brain you can talk to that actually does the work. And when you’re choosing the tool you’ll open at 11pm to untangle a thought you can’t quite hold — the one you reach for instead of doomscrolling — “capable” loses to “the one that doesn’t feel like homework” every single time.</p>

<p>That’s the whole thesis. We made it fun because fun is what gets used.</p>

<p><a href="/signup">Come meet the brain →</a> It’s free during beta, and she’s waiting in the bottom-right corner.</p>
`,
  },

  {
    slug: 'real-time-collaboration-infinite-canvas',
    title: 'Real-Time Collaboration on a Mind Map: Why It Changes the Whole Exercise',
    description:
      'Live cursors, instant sync, and threaded comments turn mind mapping from a solo act into a shared room. Here’s why collaborative mind maps beat slide decks.',
    date: '2026-04-21',
    dateDisplay: 'April 21, 2026',
    author: 'The SquishyMind Team',
    category: 'Product',
    readingMinutes: 7,
    tags: ['collaboration', 'teams', 'realtime', 'features'],
    excerpt:
      'A mind map you build alone is a thinking tool. A mind map a team builds together, live, is something else entirely — a shared brain that everyone can see forming in real time. Here’s what changes when the cursors come alive.',
    body: `
<p class="lead">Solo mind mapping helps you think. Collaborative mind mapping — the real-time kind, where you can see your teammates’ cursors moving — changes what the meeting <em>is</em>.</p>

<p>Most team ideation happens in one of two broken modes. Either one person “drives” while everyone watches a screen share and calls out suggestions (slow, hierarchical, and quietly silencing for the people who don’t want to interrupt), or everyone goes off and works alone and you spend the next meeting reconciling six versions. Real-time collaborative mapping kills both problems at once.</p>

<h2>Everyone builds at the same time</h2>
<p>In SquishyMind, when you invite teammates to a map, you see each other’s cursors move live on the canvas, labelled with their names. Edits sync between browsers in about a second. That means three people can be expanding three different branches simultaneously, and the map grows in three places at once. The bottleneck of “whose turn is it to talk” simply evaporates.</p>
<p>This is genuinely different from a shared document. A doc is linear — two people editing the same paragraph collide. A canvas is spatial — you naturally spread out into different regions, and the structure of the map keeps everyone’s contributions legible to each other.</p>

<blockquote>A slide deck shows a team’s conclusions. A live mind map shows a team’s thinking — while it’s still happening, while it can still change.</blockquote>

<h2>Comments where the idea lives</h2>
<p>Feedback usually arrives detached from its target: “on slide 4, the second bullet — wait, which version are we looking at?” SquishyMind puts threaded comments directly on individual nodes. The feedback lives <em>on</em> the idea it’s about. You can resolve a thread when it’s handled, and the conversation history travels with the node forever.</p>

<h2>Roles that match how reviews actually work</h2>
<p>Not everyone in a map should be able to rearrange the furniture. SquishyMind has two roles:</p>
<ul>
<li><strong>Editor</strong> — full control: add, move, delete, rename, edit notes.</li>
<li><strong>Commenter</strong> — can read the map and leave threaded comments on nodes, but can’t change the canvas itself.</li>
</ul>
<p>That second role is the one teams underestimate. It’s how you get a stakeholder’s feedback without handing them the ability to accidentally drag your carefully structured plan into chaos. Reviewers review. Builders build. Everyone stays in their lane without anyone having to police it.</p>

<h2>The infinite canvas is the point</h2>
<p>Collaboration only works if there’s room for everyone. A fixed-size board forces people to compete for space. SquishyMind’s canvas is infinite — pan and zoom forever, with no page boundaries. A team can sprawl a quarter’s planning across one enormous map and zoom in to whichever corner they’re working on. The shape of the whole thing stays available the moment anyone zooms out.</p>

<h2>When you’d reach for this</h2>
<p>Sprint planning. Retrospectives. Mapping a user journey with design and engineering in the same map. Onboarding a new hire by walking them through a living map of how the product fits together. Any moment where the goal is shared understanding, not a polished artifact, a collaborative mind map beats the deck — because the deck is finished and the thinking isn’t.</p>

<p>Real-time collaboration is part of Squishy Premium after beta, but it’s <a href="/pricing">free for everyone while the beta banner is up</a> — and beta signups lock in Founder pricing forever. <a href="/signup">Start a shared map →</a></p>
`,
  },

  {
    slug: 'how-students-use-mind-maps-to-study',
    title: 'How Students Actually Use Mind Maps to Study Smarter',
    description:
      'Mind maps beat re-reading and highlighting for retention. Here’s how students use mind mapping to revise, connect ideas, and study less for better results.',
    date: '2026-03-30',
    dateDisplay: 'March 30, 2026',
    author: 'The SquishyMind Team',
    category: 'How-to',
    readingMinutes: 7,
    tags: ['students', 'studying', 'learning', 'mind mapping'],
    excerpt:
      'Highlighting feels productive and does almost nothing. Mind mapping feels like more work and does almost everything. Here’s the research-backed reason, plus a practical revision workflow students actually stick to.',
    body: `
<p class="lead">If you’ve ever highlighted an entire textbook page yellow and felt accomplished, this article is gently for you. Highlighting is one of the least effective study techniques ever measured. Mind mapping is one of the most. The difference comes down to a single word: <strong>connection.</strong></p>

<h2>Why re-reading and highlighting fail</h2>
<p>Both create the <em>feeling</em> of learning — the page looks familiar, so your brain reports “got it.” But familiarity isn’t recall. You’re not building the retrieval pathways you’ll actually need in the exam; you’re just polishing recognition. The moment the cue changes — a question phrased differently from the textbook — the familiarity evaporates and you’re stuck.</p>

<h2>Why mind mapping works</h2>
<p>A mind map forces three things that genuinely build memory:</p>
<ul>
<li><strong>Active reconstruction.</strong> You can’t map a concept without first pulling it apart and deciding how the pieces relate. That act of restructuring is the learning.</li>
<li><strong>Visible connections.</strong> Knowledge isn’t a list, it’s a web. A map shows the links between concepts — the exact thing exams test and flat notes hide.</li>
<li><strong>Spatial memory.</strong> Your brain is extraordinarily good at remembering <em>where</em> things are. A map gives every idea a location, and that location becomes a retrieval handle.</li>
</ul>

<blockquote>Re-reading asks “does this look familiar?” Mind mapping asks “can you rebuild this from scratch?” Only one of those questions is on the exam.</blockquote>

<h2>A revision workflow that sticks</h2>
<h3>1. Map from memory first</h3>
<p>Before you open the textbook, map everything you already know about the topic. This is a brutal, useful diagnostic — the gaps in your map are exactly the gaps in your knowledge. Now you know precisely what to study, instead of re-reading everything “to be safe.”</p>
<h3>2. Fill the gaps, don’t copy the book</h3>
<p>Go to the source only to fill the holes your memory-map revealed. Add nodes for what was missing. Resist copying — paraphrase into your own words, because the paraphrasing is the encoding.</p>
<h3>3. Connect across topics</h3>
<p>The highest-value move: link nodes in <em>this</em> map to ideas from other topics. Cross-topic connections are where deep understanding lives and where the hardest exam questions aim.</p>
<h3>4. Rebuild it blank the day before</h3>
<p>The night before, recreate the whole map on a blank canvas without looking. What you can rebuild, you know. What you can’t is your final, tiny, high-yield study list.</p>

<h2>Where the tooling helps</h2>
<p>You can do all of this on paper, and paper is great. A digital tool earns its place in three spots: <strong>imports</strong> (paste your Markdown lecture notes from Notion or Obsidian and SquishyMind turns the headings into a starting hierarchy), <strong>AI expansion</strong> (stuck on a node? ask Squishy to suggest sub-points, then edit — the editing keeps you active), and <strong>views</strong> (revise in Outline mode for linear recall, switch to Canvas mode to see the web). And it’s genuinely <a href="/pricing">free during beta</a>, which matters on a student budget.</p>

<p><a href="/signup">Map your first topic free →</a> Try the memory-map diagnostic on whatever you’re revising this week — the gaps will surprise you.</p>
`,
  },

  {
    slug: 'mind-mapping-vs-note-taking',
    title: 'Mind Mapping vs Note-Taking: When Each One Actually Wins',
    description:
      'Linear notes and mind maps solve different problems. Here’s a clear guide to when to take notes, when to map, and how to use both together.',
    date: '2026-03-12',
    dateDisplay: 'March 12, 2026',
    author: 'The SquishyMind Team',
    category: 'Mind mapping',
    readingMinutes: 6,
    tags: ['note-taking', 'mind mapping', 'productivity', 'comparison'],
    excerpt:
      'The “mind maps vs notes” debate is a false fight. They’re different tools for different jobs. Here’s how to tell which one a given situation actually needs — and how the best thinkers use both.',
    body: `
<p class="lead">People love to ask whether mind mapping is “better” than note-taking, the way they ask whether a hammer is better than a screwdriver. It’s the wrong question. The right one is: <strong>what is this particular moment asking of you?</strong></p>

<h2>What linear notes are good at</h2>
<p>Notes are sequential, and sequence is sometimes exactly right:</p>
<ul>
<li><strong>Capturing things that arrive in order</strong> — a lecture, a meeting, a recipe, a process with real steps.</li>
<li><strong>Detail and nuance</strong> — full sentences, caveats, quotes. Maps compress; notes preserve.</li>
<li><strong>Speed of capture</strong> — when information is coming fast and you just need it down, linear is frictionless.</li>
</ul>
<p>If the information has an inherent order and you mostly need to <em>record</em> it, take notes. Don’t force a map onto a thing that’s genuinely a list.</p>

<h2>What mind maps are good at</h2>
<p>Maps are spatial and relational, which wins whenever structure is the actual problem:</p>
<ul>
<li><strong>Seeing relationships</strong> — how ideas connect, cluster, and depend on each other.</li>
<li><strong>Thinking before you know the order</strong> — brainstorming, planning, untangling. The order is the <em>output</em>, not the input.</li>
<li><strong>Getting the big picture</strong> — one glance shows the whole shape, which a 12-page note never will.</li>
<li><strong>Non-linear material</strong> — a knowledge domain, a project with interdependencies, a decision with branching consequences.</li>
</ul>

<blockquote>Notes answer “what was said?” Maps answer “how does it all fit together?” Most hard thinking is the second question wearing the costume of the first.</blockquote>

<h2>The move most people miss: use both</h2>
<p>The strongest workflow isn’t choosing — it’s sequencing. <strong>Capture linearly, then restructure spatially.</strong> Take fast notes in the meeting or lecture. Afterwards, turn those notes into a map. The act of converting forces you to decide what relates to what, which is precisely the deep-processing step that flat notes skip. You end up with both: the detailed record <em>and</em> the structural understanding.</p>
<p>This is why SquishyMind supports <strong>Markdown, CSV, and OPML import</strong>. Your linear notes — from Notion, Obsidian, a Google Doc, wherever — come straight in, and the heading structure becomes a first-draft hierarchy you then reshape on the canvas. The capture stays fast and linear where it should be; the thinking gets spatial where it pays off.</p>

<h2>A quick decision rule</h2>
<p>Ask one question: <em>do I already know the order?</em> If yes — it’s a sequence, a process, a transcript — take notes. If no — if figuring out the order, the structure, or the connections <em>is the work</em> — make a map. And when in doubt, capture as notes and map afterwards. You’ll rarely regret doing both.</p>

<p><a href="/signup">Try importing your notes into a map →</a> Paste a Markdown outline and watch it become a canvas in one step. Free during beta.</p>
`,
  },

  {
    slug: 'eight-mind-map-templates-worth-starting-from',
    title: 'The 8 Mind Map Templates Worth Starting From',
    description:
      'Eight battle-tested mind map templates — project plans, decision trees, second brains, SWOT, and more — plus when to reach for each one.',
    date: '2026-02-24',
    dateDisplay: 'February 24, 2026',
    author: 'The SquishyMind Team',
    category: 'How-to',
    readingMinutes: 6,
    tags: ['templates', 'frameworks', 'productivity', 'mind mapping'],
    excerpt:
      'A blank canvas is freedom, and freedom is paralysing when you’re tired. A good template removes the first ten decisions so you can get to the actual thinking. Here are the eight we ship — and when each one earns its place.',
    body: `
<p class="lead">The blank-page problem is real. Staring at an empty canvas, you spend your first burst of energy not on thinking but on <em>deciding how to start thinking.</em> A template spends that energy for you. Here are the eight SquishyMind ships with, and the situation each one is built for.</p>

<h2>1. Project plan</h2>
<p>Phases as primary branches, tasks as children, dependencies as cross-links. Reach for it when you know the rough shape of a project but need to make it concrete and shareable. The spatial layout makes it instantly obvious which phase is overloaded and where the critical path runs.</p>

<h2>2. Decision tree</h2>
<p>A central question with branching yes/no paths and consequences at the leaves. Perfect for product calls, career forks, or any choice where you keep going in circles. Externalising the branches stops you from re-litigating the same fork in your head at 2am.</p>

<h2>3. Second brain (PARA)</h2>
<p>Projects, Areas, Resources, Archives — the backbone of a personal knowledge system. Use it as the home base for everything you’re tracking. It’s less a one-off map and more a living dashboard for your life and work.</p>

<h2>4. Weekly review</h2>
<p>Wins, in-progress, blocked, next week, and a small “how am I doing” corner. A Friday ritual that takes ten minutes and quietly compounds. Mapping the week beats listing it because you see the balance — too much red in “blocked,” nothing in “wins,” and the pattern tells you something.</p>

<h2>5. Learning notes</h2>
<p>A topic at the centre, sub-concepts branching out, with room to link across to related ideas. Built for the study workflow where you map from memory first, then fill gaps. Pairs naturally with importing your existing notes.</p>

<h2>6. SWOT analysis</h2>
<p>Strengths, Weaknesses, Opportunities, Threats — four quadrants, ready to fill. The classic strategy framework, made spatial so the relationships between, say, a weakness and a threat become visible instead of buried in two separate lists.</p>

<h2>7. Meeting agenda</h2>
<p>Topics as branches, talking points as children, decisions and action items as a distinct colour. Build it before the meeting, expand it live, and you walk out with a structured record instead of a wall of text nobody will reread.</p>

<h2>8. Brainstorm dump</h2>
<p>Deliberately unstructured — one central prompt and permission to go wild. This is the template for Stage 1 of any creative process: get everything out, judge nothing, organise later. It’s the one Squishy will most often suggest when she catches you staring at an empty brain.</p>

<blockquote>A template isn’t a cage. It’s a running start. Delete what doesn’t fit, rename what does, and within a minute it’s your map, not ours.</blockquote>

<h2>Can’t decide? Ask the brain</h2>
<p>Here’s the part that’s genuinely useful: you don’t have to choose from a gallery. Tell Squishy what you’re trying to do — “I need to plan a product launch” or “I’m trying to decide whether to switch jobs” — and she’ll suggest the right template and set it up for you. The fastest start is the one where you describe the problem and the canvas appears already shaped for it.</p>

<p><a href="/signup">Browse the templates free →</a> Pick one, or just tell the brain what you’re working on.</p>
`,
  },

  {
    slug: 'squishymind-vs-mindmeister-miro-obsidian',
    title: 'SquishyMind vs MindMeister, Miro, and Obsidian: An Honest Comparison',
    description:
      'A fair, detailed comparison of SquishyMind against MindMeister, Miro, and Obsidian — where each wins, where each loses, and which mind mapping tool fits you.',
    date: '2026-02-03',
    dateDisplay: 'February 3, 2026',
    author: 'The SquishyMind Team',
    category: 'Comparisons',
    readingMinutes: 9,
    tags: ['comparison', 'mindmeister', 'miro', 'obsidian', 'alternatives'],
    excerpt:
      'We’re not going to pretend the alternatives are garbage. MindMeister, Miro, and Obsidian are all genuinely good at specific things. Here’s a fair breakdown of where each one wins, where SquishyMind wins, and how to pick.',
    body: `
<p class="lead">Most “vs” articles are thinly disguised sales pitches that conclude, shockingly, that the author’s product wins every category. This isn’t that. The alternatives below are good tools. Here’s an honest read on where each one beats us — and where we beat them.</p>

<h2>SquishyMind vs MindMeister</h2>
<p><strong>Where MindMeister wins:</strong> It’s been around since 2007 and it shows in the polish — a genuinely nice presentation mode, mature MeisterTask integration for turning maps into project boards, and the reassurance of a long track record.</p>
<p><strong>Where SquishyMind wins:</strong> MindMeister’s free plan caps you at three maps, which pushes you toward a paid plan fast. It has no voice AI and no conversational interface — you build everything by hand. And the interface, while polished, feels of its era. SquishyMind gives you a voice assistant that builds maps for you, an animated canvas that’s genuinely pleasant to sit in, and — during beta — free access with Founder pricing locked in for life.</p>
<p><strong>Pick MindMeister if:</strong> presentation output and project-management integration are your top priorities and you don’t care about AI. <strong>Pick SquishyMind if:</strong> you want voice-driven mapping and a tool that’s a pleasure to open.</p>

<h2>SquishyMind vs Miro</h2>
<p><strong>Where Miro wins:</strong> Miro is a powerhouse. It’s a full collaborative whiteboard platform — not just mind maps but flowcharts, wireframes, retros, the works. It’s built for large enterprises with SSO, audit logs, and a vast template marketplace. If you need a general visual workspace for a 200-person org, Miro is built for exactly that.</p>
<p><strong>Where SquishyMind wins:</strong> That power is also Miro’s tax. There’s no dedicated mind-map mode — everything is freeform shapes you arrange yourself, which means more setup for the specific job of mapping ideas. The free plan is limited to three editable boards. And there’s no voice AI. SquishyMind is purpose-built for mind mapping: auto-coloured branches, four map-specific view modes, and a brain that does the structuring for you.</p>
<p><strong>Pick Miro if:</strong> you need an all-purpose visual workspace for a big team. <strong>Pick SquishyMind if:</strong> mind mapping specifically is the job, and you want it focused and fun.</p>

<blockquote>Miro is a whiteboard that can do mind maps. SquishyMind is a mind mapping app that happens to be collaborative. The right answer depends entirely on which sentence describes your actual need.</blockquote>

<h2>SquishyMind vs Obsidian</h2>
<p><strong>Where Obsidian wins:</strong> Obsidian is a local-first fortress. Your notes are plain Markdown files on your own machine — total privacy, total control, no vendor between you and your data. The plugin ecosystem is enormous, and for personal use it’s free. For people who want to own their knowledge base outright, nothing beats it.</p>
<p><strong>Where SquishyMind wins:</strong> Obsidian’s celebrated graph view is a <em>link graph</em>, not a mind mapping tool — it visualises connections between notes, but you can’t fluidly build and restructure a map on it the way you can on a real canvas. Real-time collaboration isn’t built in (Obsidian Sync is a separate $10/month add-on, and even then it’s sync, not live co-editing). The learning curve is steep — you assemble your own system. And there’s no voice AI. SquishyMind is visual-first, collaborative out of the box, and you can talk to it.</p>
<p><strong>Pick Obsidian if:</strong> local-first privacy and a Markdown knowledge base matter most. <strong>Pick SquishyMind if:</strong> you want a visual, collaborative, voice-driven canvas and don’t want to build your system from parts.</p>

<h2>The honest summary</h2>
<p>If we had to compress it: MindMeister is the established classic, Miro is the enterprise whiteboard, Obsidian is the local-first knowledge fortress, and SquishyMind is the fun, voice-first, collaborative mind mapping app that’s purpose-built for the specific act of mapping ideas — and free while we’re in beta.</p>
<p>The thing none of the others have is a brain in the corner you can talk to that actually builds the map. If that sounds like a gimmick, read our <a href="/blog/meet-squishy-voice-ai-that-does-things">deep dive on the voice agent</a> — it does considerably more than you’d expect.</p>

<p>Want the feature-by-feature table? It’s on our <a href="/compare">comparison page</a>. Or just <a href="/signup">try SquishyMind free →</a> and decide with your own hands.</p>
`,
  },

  {
    slug: 'meet-squishy-voice-ai-that-does-things',
    title: 'Meet Squishy: The Voice AI That Actually Builds Your Mind Map',
    description:
      'Most AI assistants talk. Squishy does. Meet the voice agent that builds branches, reorganises maps, and expands ideas by voice — a real agentic mind mapping AI.',
    date: '2026-01-14',
    dateDisplay: 'January 14, 2026',
    author: 'The SquishyMind Team',
    category: 'Product',
    readingMinutes: 11,
    tags: ['ai', 'voice', 'agent', 'squishy', 'features'],
    excerpt:
      'Plenty of apps have bolted a chatbot into a sidebar that can tell you about your data. Squishy is different in the way that matters: she takes actions on your canvas. Ask her to build a branch and a branch appears. This is the deep dive on the agent.',
    body: `
<p class="lead">There’s a quiet but enormous difference between an AI that can <em>talk about</em> your work and an AI that can <em>do</em> your work. Most “AI assistants” bolted into software are the first kind — a chat box that summarises, suggests, and answers questions, but ultimately hands the doing back to you. Squishy is the second kind. You talk; she takes actions on the canvas. That gap is the whole story, so let’s tell it properly.</p>

<h2>The difference between a chatbot and an agent</h2>
<p>A chatbot is a conversation. You ask, it answers, and any resulting work — the copying, the clicking, the building — is still yours to do. It’s a smarter help menu.</p>
<p>An agent is a conversation that <em>causes things to happen.</em> When you tell Squishy “add three branches under Marketing for paid, organic, and partnerships,” she doesn’t describe how you might do that. She does it. Three nodes appear, correctly parented, correctly coloured, while you keep talking. The doing collapses into the asking.</p>
<p>This is what people mean by “agentic AI,” and most products claiming it don’t actually have it. They have a chatbot wearing the word “agent” as a costume. Squishy is wired directly into the canvas’s operations — the same functions the buttons call — so anything you can do by hand, she can do by voice.</p>

<blockquote>The test for a real agent is simple: after you speak, does the work exist? With Squishy, the branch is on the canvas before you’ve finished your sentence. That’s the line between talking about thinking and actually thinking faster.</blockquote>

<h2>What Squishy can actually do</h2>
<p>Not a wish list — these are live capabilities:</p>
<ul>
<li><strong>Create nodes and branches.</strong> “Add a child under ‘Q3 goals’ called ‘Hire two engineers.’” Done, parented correctly.</li>
<li><strong>Build entire subtrees on command.</strong> “Under ‘Launch plan,’ give me branches for pre-launch, launch day, and post-launch, with a couple of tasks each.” She constructs the whole structure.</li>
<li><strong>Move and reorganise.</strong> “Move ‘Budget’ to be a child of ‘Operations’ instead.” The node reparents and the edges redraw.</li>
<li><strong>Rename and edit.</strong> Change labels, fix wording, tidy up — all by voice.</li>
<li><strong>Summarise your structure.</strong> “What does this map look like so far?” She reads the actual structure back to you — useful when a map has grown past what you can hold in your head.</li>
<li><strong>Expand an idea.</strong> Point her at a node and ask for sub-points; she generates a first draft you then shape.</li>
<li><strong>Suggest a template.</strong> Describe your goal and she’ll set up the right starting structure.</li>
<li><strong>Argue with you.</strong> Genuinely — ask her to pressure-test a bad idea and she will. She’s been argued with. She holds up.</li>
</ul>

<h2>She knows where she is</h2>
<p>A generic assistant answers every question from a standing start. Squishy doesn’t. She receives context about your session — which page you’re on, whether you’re logged in, how many collaborators are currently in the map — so her help is situated, not generic. Ask “who else is here?” in a shared map and she actually knows. Mention “this page” and she knows which one. The result is a partner that feels present rather than a search box that happens to talk.</p>

<h2>Why voice, specifically</h2>
<p>Voice isn’t a novelty here — it’s matched to the task. Mind mapping is what you do when your thoughts are arriving faster than you can organise them. In that state, the bottleneck is the interface: every time you stop to find a menu, click, and type, you lose the next thought. Voice removes that gap. You can hold a train of thought and narrate it onto the canvas at the speed you think, hands never leaving the idea. For brainstorming and brain-dumping especially, talking is simply faster than building — and Squishy turns the talking into structure in real time.</p>
<p>It’s also a quiet accessibility win. For anyone for whom precise mouse-and-keyboard work is tiring or difficult — motor differences, RSI, or just the end of a long day — being able to build a complex map by voice changes who the tool is for.</p>

<h2>And she’s optional</h2>
<p>Here’s the part that keeps the whole thing honest: Squishy is a feature, not a religion. The entire app works perfectly without ever talking to her. Click, drag, type, keyboard-shortcut your way through everything — she sits muted in the corner until you want her. We built a voice agent that can do real work <em>and</em> a mind mapping tool that doesn’t need it. Most people end up using her for the messy, fast, generative parts — the brain dump, the “just get it down” moments — and their hands for the careful refinement. That blend is the sweet spot.</p>

<h2>The thing under the hood (briefly)</h2>
<p>Without turning this into an engineering post: Squishy’s voice and conversational layer run on a real-time voice platform, and her actions are defined as a set of tools mapped directly to canvas operations. When she decides to add a node, that’s a tool call that fires the same code your click would. Her conversation persists across sessions, so she remembers the thread of what you were doing. The design goal throughout was simple — <strong>close the distance between the thought and the structure to as near zero as we can get it.</strong></p>

<h2>Try the part words can’t capture</h2>
<p>You can read about an agent all day, but the moment it clicks is the first time you say something out loud and watch the map build itself in response. It’s a small piece of the future arriving early. Open a map, click the pink brain in the bottom-right, and say “help me plan my week.” See what happens.</p>

<p><a href="/signup">Meet Squishy free →</a> She’s waiting in the corner, and during beta the whole thing is free with Founder pricing locked in for life.</p>
`,
  },

  {
    slug: 'mind-mapping-for-adhd',
    title: 'Mind Mapping for ADHD: Working With Your Brain Instead of Against It',
    description:
      'Why mind mapping fits the ADHD brain better than linear lists — and a practical, low-friction approach to capture, focus, and follow-through that actually sticks.',
    date: '2025-12-22',
    dateDisplay: 'December 22, 2025',
    author: 'The SquishyMind Team',
    category: 'ADHD & focus',
    readingMinutes: 9,
    tags: ['adhd', 'add', 'focus', 'neurodivergent', 'mind mapping'],
    excerpt:
      'Linear to-do lists are designed for a kind of brain that takes its working memory and prioritisation for granted. If yours doesn’t, mind mapping isn’t a nice-to-have — it’s a fundamentally better match for how you think.',
    body: `
<p class="lead">If you have ADHD, you’ve probably been told to “just make a list” more times than you can count, by people who could not understand why such obvious advice kept failing you. Here’s the reframe: the list isn’t failing because you’re undisciplined. It’s failing because a linear list is built for a brain that yours simply isn’t. Mind mapping is built much closer to yours.</p>

<h2>Why linear lists fight the ADHD brain</h2>
<p>A to-do list makes three quiet assumptions, and ADHD brains struggle with all three:</p>
<ul>
<li><strong>That you can hold the whole list in mind.</strong> Lists rely on working memory to keep the big picture present while you work an item. ADHD working memory is often overloaded — so the list collapses to whatever single line you’re looking at, and everything else vanishes. Out of sight, genuinely out of mind.</li>
<li><strong>That you can rank by importance on demand.</strong> Lists are implicitly ordered. But ADHD makes prioritisation genuinely hard — everything can feel equally urgent or equally inert. Forced ranking becomes a stall point, and the list never even gets made.</li>
<li><strong>That a wall of text is engaging.</strong> A flat list is visually monotonous, and monotony is kryptonite for a brain that runs on interest and novelty. Your eyes slide off it. It feels like a chore before you’ve done a single thing on it.</li>
</ul>

<h2>Why mind maps fit better</h2>
<p>Mind mapping inverts all three problems, and it’s not a coincidence — it’s structural:</p>
<ul>
<li><strong>It externalises the big picture.</strong> The whole shape lives on the screen, not in your head. You’re no longer paying a working-memory tax to remember what else exists — it’s all visible at once. For an overloaded working memory, this is enormous relief.</li>
<li><strong>It lets you defer ordering.</strong> You can dump everything down with no order at all, then arrange spatially <em>afterward</em>, by dragging. Prioritisation becomes a visual, physical act you do once things are out — not a gate you have to pass to begin.</li>
<li><strong>It’s visually engaging.</strong> Colour, branches, spatial structure, movement. A map is interesting to look at in a way a list never is, and “interesting” is precisely the fuel an ADHD brain needs to stay with something.</li>
</ul>

<blockquote>A list asks your weakest cognitive muscles — working memory and on-demand prioritisation — to do all the lifting. A map hands that lifting to the page and to your spatial sense, which for many ADHD brains is a genuine strength.</blockquote>

<h2>The capture problem, and why friction is the enemy</h2>
<p>The single most important thing for an ADHD brain is to capture a thought <em>the instant it arrives</em>, because it will not still be there in thirty seconds. The enemy of capture is friction — every step between “idea” and “recorded” is a chance for the idea to evaporate or for the task of recording to feel like too much.</p>
<p>This is exactly where a voice-driven map changes the game. In SquishyMind you can click the brain and just <em>say</em> the thought — “remind me the landlord thing, and add a branch for the trip, and I need to call the dentist” — and Squishy drops each one onto the canvas while you keep talking. No app-switching, no typing, no deciding where it goes first. The gap between thought and capture shrinks to almost nothing, which is the whole ballgame.</p>

<h2>A low-friction approach that survives a bad day</h2>
<h3>Capture into one trusted map</h3>
<p>Have a single “brain” map that everything lands in. Don’t make yourself decide which map or which category at capture time — that decision is friction, and friction loses the thought. One inbox. Sort later.</p>
<h3>Sort only when you have the energy</h3>
<p>Sorting is a different mode from capturing, and it needs different (often more) energy. Separate them ruthlessly. Capture all day with zero organisation guilt. Sort in a dedicated burst when you’ve got the bandwidth — drag related nodes together, and the structure emerges from the pile.</p>
<h3>Pull one thread, ignore the rest</h3>
<p>On a hard day, the map can feel as overwhelming as the list did. The move: zoom into one branch, collapse or ignore the rest, and let the canvas hold everything else <em>for</em> you so you don’t have to. The relief of “it’s all safely down, I only have to look at this one corner” is the entire point.</p>
<h3>Let “ugly and done” beat “tidy and someday”</h3>
<p>Your map does not need to be beautiful. The auto-colouring will make it look composed regardless, which removes one more decision — you never have to think about colour. A messy map that captured your thoughts beats a pristine one you were too perfectionist to start.</p>

<h2>This isn’t a cure, it’s a better-fitting tool</h2>
<p>Mind mapping won’t fix executive dysfunction, and we’re not going to pretend otherwise. But the right tool, shaped to how your brain actually works, removes a category of friction that linear systems pile on. For a lot of ADHD and ADD folks, that’s the difference between a system they abandon in a week and one they actually keep. If lists have never stuck for you, the problem might genuinely have been the list.</p>

<p><a href="/signup">Try a voice-first brain dump free →</a> Open a map, click the brain, and just talk. See how much lower the bar to capture gets. There’s a fuller <a href="/blog/brain-dump-to-structure-workflow-overwhelmed-minds">workflow guide here</a> when you’re ready for the next step.</p>
`,
  },

  {
    slug: 'why-your-brain-doesnt-think-in-lists',
    title: 'Why Your Brain Doesn’t Think in Lists (And What to Do About It)',
    description:
      'Your mind works by association, not sequence. Here’s the science of why mind mapping matches how you actually think — and how to start mapping today.',
    date: '2025-12-09',
    dateDisplay: 'December 9, 2025',
    author: 'The SquishyMind Team',
    category: 'Mind mapping',
    readingMinutes: 6,
    tags: ['mind mapping', 'thinking', 'creativity', 'basics'],
    excerpt:
      'You don’t remember your life as a numbered list. You remember it as a web of connected things. So why do we keep forcing our messiest, most associative thinking into neat vertical columns? Here’s the case for mapping instead.',
    body: `
<p class="lead">Try to recall what you did last weekend. Notice the <em>shape</em> of the memory as it arrives. It’s not item 1, item 2, item 3. It’s a tangle — a place reminds you of a person reminds you of a conversation reminds you of a thing you meant to do. Your mind is an association engine. So here’s the strange thing: when we sit down to think hard, we force all that branching, associative richness into a flat vertical list. And then we wonder why it feels like pushing thought through a straw.</p>

<h2>The brain is a network, not a spreadsheet</h2>
<p>At the most literal level, your brain is a web of neurons connected to other neurons — ideas linked to related ideas in a vast, branching network. This is why one thought leads to another that seems unrelated until you trace the path. Memory, creativity, and understanding all run on these associative links. A network is your native format.</p>
<p>A list is the opposite of a network. It’s a single line, one item after another, every connection except “comes before / comes after” stripped away. When you write a list, you’re flattening a three-dimensional structure into one dimension and throwing out the relationships — which are very often the most important information you had.</p>

<blockquote>A list keeps the items and discards the connections. But in most real thinking, the connections <em>were the point.</em></blockquote>

<h2>What a mind map preserves</h2>
<p>A mind map keeps the network intact. A central idea branches into sub-ideas, which branch further, and — crucially — ideas in different branches can link to each other. The structure on the page mirrors the structure in your head. Three things follow from that:</p>
<ul>
<li><strong>You see the whole at a glance.</strong> The big picture and the details coexist. You can zoom out to the shape or in to a leaf without losing either.</li>
<li><strong>Connections become visible.</strong> The link between two far-apart ideas — the insight — is something you can literally draw, instead of something you have to hold in your head and hope to remember.</li>
<li><strong>Adding an idea is frictionless.</strong> A new thought doesn’t have to fit in sequence. It just attaches wherever it belongs, the way it does in your mind.</li>
</ul>

<h2>This is why mapping <em>feels</em> different</h2>
<p>People often describe their first real mind-mapping session as a kind of relief, and there’s a reason. You’re no longer translating associative thought into linear form on the fly — a translation that costs effort and loses information every time. You’re thinking in the format you already think in. The tool stops fighting you.</p>

<h2>How to start (it’s genuinely easy)</h2>
<p>You don’t need a course. Put your topic in the centre. Add whatever comes to mind as branches — no order, no judgment. When a branch sparks a sub-thought, branch off it. When two distant ideas connect, link them. That’s the entire technique. The skill isn’t in the rules; it’s in giving yourself permission to be associative on purpose.</p>
<p>You can do it on paper, on a whiteboard, or in a tool built for it. The advantage of a digital canvas is that it never runs out of room, you can rearrange endlessly without redrawing, and — in SquishyMind’s case — you can even talk your map into existence and let the brain in the corner branch it out for you while you think out loud.</p>

<p>However you do it, the shift is the same: stop forcing a network into a line. Think in the shape your mind already has.</p>

<p><a href="/signup">Make your first map free →</a> Put one idea in the middle and see where it branches. Curious how the AI fits in? Here’s <a href="/blog/meet-squishy-voice-ai-that-does-things">the deep dive on Squishy, our voice agent</a>.</p>
`,
  },
];

/** Lookup helper for the [slug] route. Returns the post regardless of
 *  publish state — callers gate on `isPublished` so a 404 can be returned
 *  for queued posts. */
export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

/** Hero / social-card image for a post. One generated image per slug lives
 *  at /blog/<slug>.jpg (see scripts/gen-blog-images.mjs) and serves as both
 *  the in-page hero and the OpenGraph card. Returns a site-root-relative
 *  path; prefix with the origin for absolute OG URLs. */
export function postImage(slug: string): string {
  return `/blog/${slug}.jpg`;
}

/** A post is live once its publish date has arrived. Compared at day
 *  granularity in UTC so a post dated "2026-06-11" appears anywhere on the
 *  globe on the 11th, not a timezone-dependent slice of it. */
export function isPublished(post: BlogPost, now: Date = new Date()): boolean {
  return post.date <= now.toISOString().slice(0, 10);
}

/** All currently-live posts, newest first (array order already is). Future-
 *  dated (queued) posts are excluded until their date arrives. */
export function publishedPosts(now: Date = new Date()): BlogPost[] {
  return posts.filter((p) => isPublished(p, now));
}

/** Distinct categories present among published posts, in first-seen order. */
export function getCategories(now: Date = new Date()): string[] {
  const seen = new Set<string>();
  for (const p of publishedPosts(now)) seen.add(p.category);
  return [...seen];
}
