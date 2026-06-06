// Generates 5 branded persona hero images via the OpenAI Images API
// and writes them to public/usecases/<id>.jpg.
//
//   node scripts/gen-usecase-images.mjs            # only missing images
//   node scripts/gen-usecase-images.mjs --force    # regenerate all
//
// Reads OPENAI_API_KEY from .env.local. Images are committed so the repo
// doesn't depend on regenerating them.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const FORCE = process.argv.includes('--force');
const OUT = path.join(process.cwd(), 'public', 'usecases');

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
  'curved lines. Plenty of negative space. Flat-ish vector aesthetic with soft bloom. Subject: ';

// id -> the per-persona subject appended to the shared STYLE prefix.
const PROMPTS = {
  teams:
    'several glowing colored cursor arrows of different people collaborating on one shared network of nodes, teamwork on an infinite canvas',
  students:
    'a glowing network shaped like study notes and an open book, key concepts linked together, learning and revision',
  writers:
    'a glowing branching outline structure flowing into a narrative thread, story structure and chapters as connected nodes',
  product:
    'a glowing network branching into workstreams with dependency lines and a roadmap feel, product planning',
  solo:
    'a single calm glowing brain-like network, a personal second-brain, one thinker\'s private thinking space',
};

fs.mkdirSync(OUT, { recursive: true });

async function gen(id, subject) {
  const destJpg = path.join(OUT, `${id}.jpg`);
  if (!FORCE && fs.existsSync(destJpg)) {
    console.log(`skip  ${id} (exists)`);
    return;
  }
  const prompt = STYLE + subject + '.';
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
    console.error(`FAIL  ${id}: ${res.status} ${t.slice(0, 300)}`);
    return;
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    console.error(`FAIL  ${id}: no image data`);
    return;
  }

  // Write raw PNG to a temp buffer, then optimize to JPEG via sharp
  const pngBuf = Buffer.from(b64, 'base64');
  const tempPng = path.join(OUT, `${id}.png`);
  fs.writeFileSync(tempPng, pngBuf);
  const rawKb = Math.round(pngBuf.length / 1024);

  await sharp(tempPng)
    .resize(1200, 800, { fit: 'cover' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(destJpg);

  fs.unlinkSync(tempPng);

  const kb = Math.round(fs.statSync(destJpg).size / 1024);
  console.log(`OK    ${id}.jpg (${rawKb} KB png → ${kb} KB jpg)`);
}

const entries = Object.entries(PROMPTS);
console.log(`Generating ${entries.length} use-case persona images (force=${FORCE})...`);
for (const [id, subject] of entries) {
  try {
    await gen(id, subject);
  } catch (e) {
    console.error(`ERROR ${id}: ${e.message}`);
  }
}
console.log('Done.');
