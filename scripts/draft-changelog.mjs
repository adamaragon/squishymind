#!/usr/bin/env node
// Drafts the next entry for lib/changelog-data.ts using gpt-4o-mini.
//
// Usage:
//   node --env-file=.env.local scripts/draft-changelog.mjs           # print proposal
//   node --env-file=.env.local scripts/draft-changelog.mjs --apply   # write to file
//   node --env-file=.env.local scripts/draft-changelog.mjs --since <ref>
//
// Requires OPENAI_API_KEY in env. Boundary defaults to the most recent
// entry's `commit` field; falls back to the last 50 commits.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const dataPath = resolve(repoRoot, 'lib/changelog-data.ts');

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const sinceIdx = argv.indexOf('--since');
const sinceArg = sinceIdx >= 0 ? argv[sinceIdx + 1] : null;

const fileContent = readFileSync(dataPath, 'utf-8');

// `shipped` is most-recent-first, so the FIRST commit ref we find is the boundary.
const lastCommitMatch = fileContent.match(/commit:\s*['"]([a-f0-9]{6,40})['"]/);
const since = sinceArg || lastCommitMatch?.[1] || 'HEAD~50';

let log;
try {
  log = execSync(`git log ${since}..HEAD --pretty=format:'%h %s'`, {
    encoding: 'utf-8',
    cwd: repoRoot,
  }).trim();
} catch (e) {
  console.error(`Failed to read git log since ${since}: ${e.message}`);
  process.exit(1);
}

if (!log) {
  console.log(`No new commits since ${since}. Nothing to draft.`);
  process.exit(0);
}

// Strip noise: chores, style, ci, docs, typos, dependabot, "Merge".
const recentCommits = log
  .split('\n')
  .filter((line) => {
    const subject = line.slice(line.indexOf(' ') + 1);
    if (/^Merge\b/i.test(subject)) return false;
    if (/^(chore|style|ci|docs)(\(|:|\s|$)/i.test(subject)) return false;
    if (/typo/i.test(subject) && subject.length < 40) return false;
    return true;
  });

if (recentCommits.length === 0) {
  console.log(`No user-facing commits since ${since}. Nothing to draft.`);
  process.exit(0);
}

const headCommit = execSync('git rev-parse HEAD', {
  encoding: 'utf-8',
  cwd: repoRoot,
}).trim();

// Use the last 4 entries as voice samples for the model.
const voiceSamples = fileContent
  .slice(0, fileContent.indexOf('export const roadmap'))
  .slice(-3500);

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(
    'Missing OPENAI_API_KEY. Run with `node --env-file=.env.local scripts/draft-changelog.mjs`.',
  );
  process.exit(1);
}
const openai = new OpenAI({ apiKey });

const today = new Date().toLocaleString('en-US', {
  month: 'long',
  year: 'numeric',
});

console.log(`Drafting from ${recentCommits.length} commits since ${since}...`);

const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: `You write changelog entries for SquishyMind, a mind-mapping app.
Tone: concise, dry, occasionally cheeky. Squishy is a noir-femme-fatale voice agent who lives inside the app.
Output ONLY valid JSON in this exact shape:
{
  "version": "vX.Y",
  "title": "Title Case (≤5 words)",
  "date": "Month Year",
  "highlights": ["bullet ≤12 words, sentence case, no trailing period"],
  "squishyNote": "optional one-line in Squishy's voice"
}

Rules:
- Pick the next version number from the latest existing one. Bump minor (vX.Y → vX.Y+1) for additions, bump major (vX → vX+1.0) only for big new features that reshape the app.
- 3–5 highlights max. Skip pure refactors, lint fixes, doc changes, build config.
- Highlights are sentence case (lowercase except first word + proper nouns) with no period.
- squishyNote is OPTIONAL — only include when something fits, not on every entry. Squishy is dry, knowing, sometimes drops a "darling/sweetheart". One line.
- Don't invent features. Only summarize what the commits show.
- If everything in the commits is internal/maintenance with nothing user-facing, return {"skip": true} instead.`,
    },
    {
      role: 'user',
      content: `Today: ${today}

Recent commits (most recent first):
${recentCommits.join('\n')}

For voice/style reference, here are existing entries:
${voiceSamples}

Draft the next entry.`,
    },
  ],
  response_format: { type: 'json_object' },
  temperature: 0.6,
  max_tokens: 700,
});

const raw = completion.choices[0]?.message?.content || '{}';
let proposed;
try {
  proposed = JSON.parse(raw);
} catch {
  console.error('Model returned invalid JSON:', raw);
  process.exit(1);
}

if (proposed.skip) {
  console.log('No user-facing changes since the last entry. Nothing to add.');
  process.exit(0);
}

console.log('\n=== Proposed entry ===');
console.log(JSON.stringify({ ...proposed, commit: headCommit.slice(0, 7) }, null, 2));

if (!apply) {
  console.log('\nRun again with --apply to prepend this to lib/changelog-data.ts.');
  process.exit(0);
}

// Build the entry block exactly matching the file's formatting (2-space indent,
// single quotes, trailing commas).
function tsString(s) {
  // Use single quotes; escape backslashes and single quotes inside.
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const lines = [];
lines.push('  {');
lines.push(`    version: ${tsString(proposed.version)},`);
lines.push(`    title: ${tsString(proposed.title)},`);
lines.push(`    date: ${tsString(proposed.date)},`);
lines.push(`    commit: ${tsString(headCommit.slice(0, 7))},`);
lines.push('    highlights: [');
for (const h of proposed.highlights || []) {
  lines.push(`      ${tsString(h)},`);
}
lines.push('    ],');
if (proposed.squishyNote && String(proposed.squishyNote).trim()) {
  lines.push(`    squishyNote: ${tsString(proposed.squishyNote)},`);
}
lines.push('  },');
const entryBlock = lines.join('\n');

// Prepend to the array literal. The array opens with `export const shipped:
// ShippedEntry[] = [` and the first existing entry sits on the next line.
const arrayOpen = /export const shipped: ShippedEntry\[\] = \[\n/;
if (!arrayOpen.test(fileContent)) {
  console.error('Could not locate the shipped[] array opener. Aborting write.');
  process.exit(1);
}
const newFile = fileContent.replace(
  arrayOpen,
  `export const shipped: ShippedEntry[] = [\n${entryBlock}\n`,
);
writeFileSync(dataPath, newFile, 'utf-8');
console.log(`\nApplied. ${dataPath} updated.`);
