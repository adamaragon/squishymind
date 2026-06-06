# SquishyMind — Claude Code Guide

## Project overview
Mind-mapping web app. Live at **squishymind.com** (also squishymind.vercel.app).
Tagline: "Your brain, but squishier."
Repo: github.com/adamaragon/squishymind
Local: `/Users/adam/Documents/GIT/squishymind`

The product is currently in public beta. Voice agent (Squishy) lives in
the bottom-right of every page and can drive the canvas via tool calls.

## Stack
- **Next.js 16** — App Router, TypeScript. Turbopack for build + dev.
- **Supabase** — Postgres, Auth, RLS, Realtime, Storage
- **Tailwind CSS 3**
- **Vercel** — deployment (auto on push to main)
- **OpenAI** — `gpt-4o-mini` for the AI-expand feature on nodes
- **ElevenLabs** — voice agent + pre-baked SFX clips

## Key Next.js 16 gotchas
- `cookies()` is async — always `await createClient()` on the server side
- `params` is a Promise — `const { id } = await params`
- No `middleware.ts` / `proxy.ts` — we deleted it because `@supabase/ssr`
  breaks in Edge runtime. Auth is gated per-page: `if (!user) redirect('/login')`
- Session refresh does NOT happen automatically (accepted tradeoff)
- `turbopack.root` + `outputFileTracingRoot` are pinned in `next.config.js`
  because there's a stray `package-lock.json` one level up

## Route structure
| Route | Auth | Purpose |
|---|---|---|
| `/` | Public | Landing page (hero, features, FAQ, Recent shipped) |
| `/pricing` | Public | Three-tier pricing (Free / Premium / Founder Access) |
| `/founder-access` | Public | Long-form explainer for the founder-access offer |
| `/changelog` | Public | What's-new feed driven by `lib/changelog-data.ts` |
| `/signup` `/login` | Public | Auth |
| `/auth/callback` | Public | Email-confirmation callback (fires signup_confirmed event) |
| `/dashboard` | Required | Map list with create / rename / delete + template picker |
| `/m/[id]` | Required (or public per visibility) | Editor — Canvas / Outline / Tree / Table views |
| `/share/[token]` | Public | Read-only shared view |
| `/account` | Required | Profile + delete account |
| `/admin/*` | `is_admin = true` | Staff-only: Overview / Users / Maps / Comments / Activity |

## Database
Tables: `profiles` (with `is_founder`, `is_admin`), `mindmaps`, `collaborators`,
`comments`, `analytics_events`.

Key `mindmaps` columns: `id`, `owner_id`, `title`, `data` (jsonb),
`visibility` (private/unlisted/public), `share_token`, `slug` (unique text).
`mindmaps.data` shape: `{ nodes: Record<id, MindMapNode>, childIndex: Record<id, id[]>, rootId: string | null }`.

`profiles.is_founder` defaults true during beta (every signup is a founder)
and flips to false post-launch (a Phase 2 migration handles that).
`profiles.is_admin` is manually flipped per owner via SQL.

RLS note: collaborator policies use `auth.uid() = user_id` only — no
circular references through the parent mindmap.

Migrations live in `supabase/migrations/`. Currently shipped:
- `0001_init.sql` — base schema
- `0002_comments.sql` — comments table + RLS
- `0003_founder_access.sql` — `is_founder` flag
- `0004_admin.sql` — `is_admin` flag
- `0005_analytics.sql` — `analytics_events` table

## Auth pattern
```ts
// Server component / API route auth check
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```

For admin gating, use `requireAdmin()` (server pages) or `requireAdminApi()`
(API routes) from `lib/admin.ts`.

## Env vars
`.env.local` for local dev. Vercel envs must include `NEXT_PUBLIC_SITE_URL`.
Required keys:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` (Squishy agent voice)
- `ELEVENLABS_KAWAII_VOICE_ID` / `ELEVENLABS_SCIFI_VOICE_ID` / `ELEVENLABS_NOIR_VOICE_ID`
  (only used by `npm run sfx:delete` / `sfx:brain` to pre-bake clips)
- `NEXT_PUBLIC_SITE_URL`

## Supabase config (production)
- Site URL: `https://www.squishymind.com`
- Redirect URLs: `https://www.squishymind.com/**`

## Pricing positioning
- **Free** (post-beta): 5 maps / 100 nodes / 20 voice min/month
- **Founder Free** (beta signups, permanent): 8 / 150 / 40
- **Squishy Premium**: $4.99/mo · $39.99/yr · unlimited + AI + collab + imports
- **Founder Premium**: $2.99/mo · $24.99/yr — beta signups only, forever
  (40% off Premium — say "40% off", never "half off")

Beta is currently free with the founder offer active. Phase 2 billing
(Lemon Squeezy) is deliberately deferred until ~500 signups + 6 weeks of
voice-minute usage data.

## Coding conventions
- Server Components by default; add `'use client'` only when needed
- No extra error handling for impossible states — trust Next.js/Supabase guarantees
- No comments unless the WHY is non-obvious
- Keep components small and colocated with their route
- All accent treatments in the canvas/detail card use `var(--accent-c1)`
  (the per-node inline var set by `applyNodeColor`) so colour swatch picks
  reflect live
- Custom CSS tooltips: any element with `data-tip="..."` gets a styled
  popup via globals.css (200 ms hover delay, accent-tinted chip)

## Analytics
Events table writes by:
- `trackServerEvent()` from `lib/analytics.ts` — admin client, skipped in dev
- `track()` from `lib/track.ts` — fire-and-forget client beacon, skipped in dev
- `/api/track` — endpoint for the client; gates events against `CLIENT_EVENTS` allow-list

Admin dashboard at `/admin/activity` shows KPIs, 30-day chart, top events,
last-50 feed. When adding a new client event, add the name to the
`CLIENT_EVENTS` set in `lib/analytics.ts` AND wire the `track()` call in
the same commit — don't leave dead allow-list entries.

## Squishy agent (ElevenLabs)
The voice agent's system prompt + tool definitions live on ElevenLabs'
dashboard (agent ID hardcoded in `components/SquishyWidget.tsx`). Our
repo only embeds the widget and bridges client tool calls back to the
canvas. The current paste-ready system prompt and tool JSON live at
`docs/squishy-agent-config.md` — update that doc and the dashboard
whenever you add/rename/remove a tool in `CANVAS_TOOLS` (in
`lib/squishy-tools.ts`), or change something the agent would describe.

Dynamic variables pushed in:
- `current_page` from `pathToPageName(pathname)` in `lib/squishy.ts`
- `is_logged_in` from auth check
- `collaborator_count` from `squishymind:collaborator-count` event

When you add a new top-level route, add it to `pathToPageName` so
Squishy doesn't say "unknown page" on it.

## Sound effects
Pre-baked ElevenLabs clips live under `public/sfx/`:
- `pop.mp3` / `stretch.mp3` / `aww.mp3` / `ooooh.mp3` — legacy single clips
- `public/sfx/delete/0..9.mp3` — 10 rotating kawaii delete phrases
- `public/sfx/brain/{scifi,kawaii,noir}/0..9.mp3` — 30 brain-click clips

Regenerate via `npm run sfx:delete` / `npm run sfx:brain`. All clips are
committed so cloners don't need ElevenLabs credentials.

## What's shipped (since v1)
v2.0 server-synced editing · v2.4 voice agent · v2.5 voice canvas control ·
v2.6 changelog · v2.7 beta launch · v2.8 page-aware Squishy · v2.9 templates +
drag-to-move + voice themes · v2.10 collaboration cursors + RT sync · v3.0
comments + edit-awareness · v3.1 imports (MD/CSV/OPML/JSON) + four views ·
v3.2 views dazzle pass · v3.3 attachments via shared NodeDetailPanel · v3.4
Founder Access positioning · v3.5 fleshed-out templates · v3.6 canvas
attachments + table click-to-edit.

Admin section + analytics dashboard shipped between v3.5 and v3.6
(internal-only, not in the user-facing changelog).

## Do not do
- Do not add `middleware.ts` or `proxy.ts` — breaks Edge runtime with @supabase/ssr
- Do not use synchronous `cookies()` — always `await`
- Do not mock Supabase in tests — use real DB
- Do not add a `CLIENT_EVENTS` entry without a matching `track()` call — dead
  allow-list entries pile up
- Do not promise "free forever" — see `app/founder-access/page.tsx` for the
  honest framing we settled on
