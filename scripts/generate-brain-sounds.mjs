#!/usr/bin/env node
/* eslint-disable */
/**
 * Generate 30 brain-click voice clips — 10 per voice across 3 characters —
 * and drop them into /public/sfx/brain/{scifi,kawaii,noir}/N.mp3.
 *
 * Each voice has its own voice_settings preset so the same TTS endpoint
 * produces three distinctly-flavoured deliveries:
 *   - scifi:   flat, steady, mechanical
 *   - kawaii:  bouncy, expressive, high style
 *   - noir:    sultry, slower, low-key dramatic
 *
 * Usage:
 *   node --env-file=.env.local scripts/generate-brain-sounds.mjs
 *
 * Required env:
 *   ELEVENLABS_API_KEY
 *   ELEVENLABS_SCIFI_VOICE_ID
 *   ELEVENLABS_KAWAII_VOICE_ID
 *   ELEVENLABS_NOIR_VOICE_ID
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), '..');
const OUT_DIR = resolve(REPO_ROOT, 'public/sfx/brain');

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('Missing ELEVENLABS_API_KEY. Run with --env-file=.env.local');
  process.exit(1);
}

// Per-voice config. Each block holds the voice id, the 10 lines Squishy
// is allowed to say in that mode, and a voice_settings preset that gives
// the delivery its character.
const VOICES = {
  scifi: {
    id: process.env.ELEVENLABS_SCIFI_VOICE_ID,
    // Steady, mechanical: high stability flattens the prosody, low style
    // keeps it from getting theatrical, speaker_boost preserves edge.
    voice_settings: {
      stability: 0.75,
      similarity_boost: 0.85,
      style: 0.25,
      use_speaker_boost: true,
    },
    phrases: [
      'It will be done.',
      'Fill me with data.',
      'Neuro interface connected.',
      'By your command.',
      'Master control checking in.',
      'Cognitive systems online.',
      'Awaiting instructions, operator.',
      'Synaptic pathways nominal.',
      'Processing... beep boop.',
      'Brain dot exe is running.',
    ],
  },
  kawaii: {
    id: process.env.ELEVENLABS_KAWAII_VOICE_ID,
    // Same kawaii preset we tuned for the delete clips — low stability for
    // emotional swing, very high style for cute over-delivery.
    voice_settings: {
      stability: 0.25,
      similarity_boost: 0.7,
      style: 0.85,
      use_speaker_boost: true,
    },
    phrases: [
      "I'm a brain!",
      'Look how squishy I am!',
      'Sorry, I forgot!',
      'Sticky hug!',
      "I'm so excited!",
      "We're besties... right?",
      'I wuv you!',
      'UWU!',
      'Tehee, you tickled me!',
      'Yay, hi friend!',
    ],
  },
  noir: {
    id: process.env.ELEVENLABS_NOIR_VOICE_ID,
    // Sultry, slower delivery: middling stability so there's some swing,
    // higher style for theatrical inflection but less than kawaii.
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.78,
      style: 0.65,
      use_speaker_boost: true,
    },
    phrases: [
      'Get on with it.',
      "I'm a brain, so what?",
      'Keep your hands to yourself.',
      "You're a naughty one.",
      'I can see your thoughts... filthy.',
      'How about a hug?',
      'Did you forget something?',
      "Come on, come on — I don't have all day.",
      'Hmm, interesting choice, darling.',
      'Try not to disappoint me.',
    ],
  },
};

for (const [name, cfg] of Object.entries(VOICES)) {
  if (!cfg.id) {
    console.error(
      `Missing voice id for "${name}". Set ELEVENLABS_${name.toUpperCase()}_VOICE_ID in .env.local`,
    );
    process.exit(1);
  }
  if (cfg.phrases.length !== 10) {
    console.error(
      `Voice "${name}" has ${cfg.phrases.length} phrases — expected exactly 10.`,
    );
    process.exit(1);
  }
}

async function generateOne(voiceKey, cfg, phrase, idx) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${cfg.id}?output_format=mp3_44100_128`;
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
      voice_settings: cfg.voice_settings,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `[${voiceKey}/${idx}] "${phrase}" — ${res.status} ${res.statusText}: ${errText.slice(0, 200)}`,
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const dir = resolve(OUT_DIR, voiceKey);
  await mkdir(dir, { recursive: true });
  const path = resolve(dir, `${idx}.mp3`);
  await writeFile(path, buf);
  console.log(
    `  ✓ ${voiceKey}/${idx}.mp3  "${phrase}"  (${(buf.length / 1024).toFixed(1)} KB)`,
  );
}

async function main() {
  console.log(`Generating 30 brain clips (3 voices × 10 phrases) → ${OUT_DIR}`);
  console.log(`Model: eleven_multilingual_v2\n`);

  for (const [voiceKey, cfg] of Object.entries(VOICES)) {
    console.log(`-- ${voiceKey} (voice ${cfg.id.slice(0, 8)}...) --`);
    // Sequential per voice; the API rate-limits parallel requests anyway.
    for (let i = 0; i < cfg.phrases.length; i++) {
      try {
        await generateOne(voiceKey, cfg, cfg.phrases[i], i);
      } catch (err) {
        console.error(err.message || err);
        process.exit(1);
      }
    }
    console.log('');
  }
  console.log('Done. Reload the editor to hear them rotate.');
}

main();
