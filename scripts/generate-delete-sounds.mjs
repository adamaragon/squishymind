#!/usr/bin/env node
/* eslint-disable */
/**
 * Generate 10 kawaii "delete" sound clips and drop them into
 * /public/sfx/delete/0.mp3 ... 9.mp3.
 *
 * Pre-baking these once (vs. calling ElevenLabs every delete) keeps the
 * canvas snappy and the ElevenLabs spend at zero per click.
 *
 * Usage:
 *   node --env-file=.env.local scripts/generate-delete-sounds.mjs
 *
 * Env vars:
 *   ELEVENLABS_API_KEY            (required)
 *   ELEVENLABS_KAWAII_VOICE_ID    (optional — falls back to ELEVENLABS_VOICE_ID
 *                                  with kawaii-leaning voice_settings)
 *
 * Pick a real kawaii voice ID from your ElevenLabs library for best results.
 * Lily / Sara / Gigi-style young female voices fit the bill.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), '..');
const OUT_DIR = resolve(REPO_ROOT, 'public/sfx/delete');

// Squishy says goodbye in 10 different ways. Mix of onomatopoeia ("pow",
// "boom", "poof") and chirpy farewells ("bye-bye", "sayonara"). Short
// phrases — ElevenLabs charges per character.
const PHRASES = [
  'Boom!',
  'Bye-bye!',
  'Pow!',
  'Poof!',
  'All gone!',
  'Sayonara!',
  'Bonk!',
  'Whoosh!',
  'Yeet!',
  'Buh-bye!',
];

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId =
  process.env.ELEVENLABS_KAWAII_VOICE_ID || process.env.ELEVENLABS_VOICE_ID;

if (!apiKey || !voiceId) {
  console.error(
    'Missing ELEVENLABS_API_KEY or voice id. Run with `node --env-file=.env.local`',
  );
  process.exit(1);
}

// Voice settings tuned for kawaii: low stability = more emotional swing,
// high style = exaggerated delivery, speaker_boost on for clarity at low
// volume. These knobs are what take a "neutral" voice and push it cute.
const voiceSettings = {
  stability: 0.25,
  similarity_boost: 0.7,
  style: 0.85,
  use_speaker_boost: true,
};

async function generateOne(phrase, idx) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: phrase,
      // multilingual_v2 carries character much better than flash for
      // these short emotive clips. Flash is for low-latency streaming.
      model_id: 'eleven_multilingual_v2',
      voice_settings: voiceSettings,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `[${idx}] "${phrase}" — ${res.status} ${res.statusText}: ${errText.slice(0, 200)}`,
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const path = resolve(OUT_DIR, `${idx}.mp3`);
  await writeFile(path, buf);
  console.log(
    `  ✓ ${idx}.mp3  "${phrase}"  (${(buf.length / 1024).toFixed(1)} KB)`,
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Generating ${PHRASES.length} kawaii delete clips → ${OUT_DIR}`);
  console.log(`Voice: ${voiceId.slice(0, 8)}...   Model: eleven_multilingual_v2`);

  // Sequential rather than parallel to be polite to the rate limiter.
  for (let i = 0; i < PHRASES.length; i++) {
    try {
      await generateOne(PHRASES[i], i);
    } catch (err) {
      console.error(err.message || err);
      process.exit(1);
    }
  }
  console.log(`\nDone. Reload the editor to hear them.`);
}

main();
