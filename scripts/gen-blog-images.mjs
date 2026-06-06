// One-off generator: creates a branded hero image per blog post via the
// OpenAI Images API (gpt-image-1) and writes them to public/blog/<slug>.png.
// These double as the in-page hero AND the OG/social card for each post.
//
//   node scripts/gen-blog-images.mjs            # only missing images
//   node scripts/gen-blog-images.mjs --force    # regenerate all
//
// Reads OPENAI_API_KEY from .env.local. Images are committed so the repo
// doesn't depend on regenerating them.

import fs from 'node:fs';
import path from 'node:path';

const FORCE = process.argv.includes('--force');
const OUT = path.join(process.cwd(), 'public', 'blog');

// Parse OPENAI_API_KEY from .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const KEY = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '');
if (!KEY) {
  console.error('No OPENAI_API_KEY in .env.local');
  process.exit(1);
}

// Shared brand look so every hero feels like the same publication.
const STYLE =
  'Editorial hero illustration, abstract and conceptual, NO text, NO words, no letters. ' +
  'Very dark indigo background (#0a0b16). Glowing gradient accents in violet (#8b5cf6), ' +
  'cyan (#06b6d4) and pink (#ec4899). Soft neon glow, subtle depth, modern, premium, calm. ' +
  'A clean abstract mind-map / neural-network motif of glowing nodes connected by gentle ' +
  'curved lines. Plenty of negative space. Flat-ish vector aesthetic with soft bloom. ';

// slug -> the per-topic subject layered on top of the shared STYLE.
const PROMPTS = {
  'the-4-views-of-a-mind-map':
    'four distinct glowing clusters of connected nodes arranged as four facets of one network, suggesting four ways of seeing the same structure',
  'organize-your-digital-life-with-one-mind-map':
    'scattered small glowing fragments converging into one calm organized central network, a sense of many things resolving into order',
  'outline-view-vs-canvas-view':
    'a split composition: one side a spreading spatial web of nodes, the other a tidy vertical stack of glowing lines, two halves of one idea',
  'why-playful-software-makes-you-more-productive':
    'a playful bouncing pink rounded blob shape among glowing nodes, soft and bubbly, a sense of delight and motion',
  'mind-mapping-for-project-management':
    'a network of glowing nodes branching into workstreams with connecting dependency lines, organized like a project plan',
  'table-view-when-your-brainstorm-is-a-spreadsheet':
    'glowing nodes softly aligning into neat rows and columns of a luminous grid, structure emerging from a cloud',
  'whats-next-for-squishymind':
    'a glowing network reaching forward into open dark space with a few sparks of new nodes forming, a sense of horizon and future',
  'science-of-why-visual-maps-stick':
    'a luminous human brain silhouette made of glowing connected nodes and colorful synapse trails, memory and cognition',
  'tree-view-untangle-complex-decisions':
    'a glowing branching tree of nodes spreading left to right, tangled threads resolving into clear branches, a decision tree',
  'weekly-planning-ritual-with-mind-maps':
    'a calm seven-segment radial network like a week laid out around a central node, gentle and organized',
  'brain-dump-to-structure-workflow-overwhelmed-minds':
    'a chaotic cloud of glowing fragments on one side flowing into a calm structured network on the other, chaos to clarity',
  'why-we-made-mind-mapping-fun':
    'a cheerful soft pink glowing brain blob with a tiny spark of personality among playful floating nodes',
  'real-time-collaboration-infinite-canvas':
    'several glowing cursor arrows of different colors moving across one shared network on an infinite dark canvas',
  'how-students-use-mind-maps-to-study':
    'a glowing network shaped like an open book or study notes, nodes like key concepts linked together, learning',
  'mind-mapping-vs-note-taking':
    'a split scene: glowing linear lines of notes on one side, a spreading web of connected nodes on the other',
  'eight-mind-map-templates-worth-starting-from':
    'eight small distinct glowing node-cluster icons arranged like a gallery of templates on dark space',
  'squishymind-vs-mindmeister-miro-obsidian':
    'one bright confident glowing network standing apart from a few dimmer generic ones, a sense of comparison',
  'meet-squishy-voice-ai-that-does-things':
    'a glowing pink AI brain mascot at the center with soundwave ripples, actively building branches of nodes around itself, voice and agency',
  'mind-mapping-for-adhd':
    'energetic colorful scattered glowing nodes finding gentle order, dynamic but calming, a brain that works differently',
  'why-your-brain-doesnt-think-in-lists':
    'a rigid vertical glowing list dissolving into a free organic spreading web of connected nodes',
};

fs.mkdirSync(OUT, { recursive: true });

async function gen(slug, subject) {
  const dest = path.join(OUT, `${slug}.png`);
  if (!FORCE && fs.existsSync(dest)) {
    console.log(`skip  ${slug} (exists)`);
    return;
  }
  const prompt = STYLE + 'Subject: ' + subject + '.';
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'medium',
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`FAIL  ${slug}: ${res.status} ${t.slice(0, 300)}`);
    return;
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    console.error(`FAIL  ${slug}: no image data`);
    return;
  }
  fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
  const kb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`OK    ${slug}.png (${kb} KB)`);
}

const entries = Object.entries(PROMPTS);
console.log(`Generating ${entries.length} blog hero images (force=${FORCE})...`);
for (const [slug, subject] of entries) {
  try {
    await gen(slug, subject);
  } catch (e) {
    console.error(`ERROR ${slug}: ${e.message}`);
  }
}
console.log('Done.');
