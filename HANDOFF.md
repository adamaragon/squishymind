# SquishyMind — Handoff (current through v3.6 + admin/analytics)

**Branch:** `main` · **Deploy:** auto via Vercel · **Live:** [squishymind.com](https://www.squishymind.com)
Local: `/Users/adam/Documents/GIT/squishymind` (the old `/Users/adam/Documents/squishy` is gone).
Run `git log --oneline -1` for current HEAD.

---

## State of the project

### Public, user-facing
- Editor with four views (Canvas / Outline / Tree / Table). Canvas is the
  imperative wobbly map, alt views read the same data structure.
- Real-time collaboration: cursors, edit-awareness chips, threaded comments
  on any node. Owner / Editor / Commenter roles.
- Imports — paste or upload Markdown, CSV, OPML, JSON.
- Eight starter templates (depth-three, 25–66 nodes each).
- Shared `NodeDetailPanel` drawer in all four views — edits label, note,
  image, generic file attachments (PDF / doc / xls / ppt / rtf / zip / gz
  / tar / 7z / txt / csv / md / json / xml / mp3 / wav / ogg / mp4 /
  webm), and deletes the node + subtree.
- Pricing page + Founder Access page. Beta signups get permanent half-off
  Premium ($1.99/mo) plus a bigger free tier. No billing wired yet —
  `is_founder` flag is set in the DB so Phase 2 (Lemon Squeezy) can
  honour it when it lands.
- Voice agent (Squishy) lives in the bottom-right of every page. Three
  voice modes — noir, kawaii, sci-fi. Drives the canvas via tool calls.

### Staff-only
- `/admin` — Overview KPIs, recent users / maps
- `/admin/users` — Search, filter (founders / admins), per-user map count
- `/admin/users/[id]` — Profile, auth metadata, maps owned, action buttons
  (Grant/Revoke Founder, Grant/Revoke Admin, Delete account)
- `/admin/maps` — All maps with search + visibility filter
- `/admin/maps/[id]` — Map detail + delete action
- `/admin/comments` — Comments moderation feed with delete
- `/admin/activity` — Analytics dashboard: KPI strip, 30-day daily-event
  chart, top events table, last-50 feed
- API mutation routes under `/api/admin/*` all gated by `requireAdminApi()`

### Behind-the-scenes
- Analytics: `analytics_events` table, server `trackServerEvent()`, client
  `track()`, `/api/track` allow-list, dev environments skip emission.
- Pre-baked ElevenLabs SFX: 10 kawaii delete phrases + 30 brain-click clips
  across 3 voices, all committed to the repo.
- Auto-changelog drafter pulls from `git log` and proposes entries; we
  hand-tune before pushing.

---

## Design patterns to know

### `data-tip="..."` tooltips
Global rule in `app/globals.css`. 200 ms hover delay, dark chip with arrow,
`z-index: 200`. Use instead of native `title=` for any new buttons/chips.
`data-tip-pos="below"` flips under for elements pinned to top edges.

### Five-accent palette
```ts
const ACCENT_PALETTE = ['#ec4899', '#8b5cf6', '#06b6d4', '#22d3ee', '#f59e0b'];
```
Declared in each alt view file. `colorIdx % 5` maps the node's colour.

### `--accent-c1` for live per-node colour
Set inline by `applyNodeColor(el, colorIdx)` in canvas. Anything in the
detail panel / canvas DOM that should update when the user picks a colour
swatch references `var(--accent-c1)` with `var(--selection)` as a fallback.
Always add a transition on `border-color` / `box-shadow` so the swap
animates.

### Height-aware tree layout
`cardHeightFor(node, hasChildren, isRoot)` returns measured height (base
56 + 22 note + 26 meta + 4 root-extra). Layout walk uses a moving
`yCursor` for leaves; parents sit at the centre of their children, clamped
so a tall parent never extends past its first child's top or its last
child's bottom. Edge endpoints use `layout.heights[id]`.

### Inverse-scale + wheel-stop pattern
For any modal-like element living **inside** the world layer (which is
scaled by `state.zoom`):
1. Set inline transform `translate(-50%, -50%) scale(1/zoom)` with
   `!important` in both `renderNodes` (initial) and `applyTransform`
   (per frame).
2. Add `e.stopPropagation()` on `wheel` so the stage's wheel-to-zoom
   handler doesn't hijack scroll.
3. The scrollable element gets `max-height` and `overflow-y: auto`.

This is the same trick presence cursors use to stay visually constant.

### Adding a new client analytics event
1. Add the name to `CLIENT_EVENTS` in `lib/analytics.ts`
2. Add the `track('event_name', { … })` call in the same commit
3. Don't ship one without the other — the allow-list rots into a
   field-of-dreams if you do

---

## Open threads / next things

- **Lemon Squeezy billing (Phase 2 of monetisation)** — deliberately deferred
  until ~500 signups + 6 weeks of voice-minute usage data. Spec lives in
  the monetisation handoff doc (not committed). When ready: add
  `subscriptions` + `voice_usage` tables, webhook handler, entitlements
  helper, upgrade UI, customer portal link.
- **Voice mode-switching for the agent** — the three voice IDs are used by
  the brain-click clip generators only. Conversation mode-switching would
  consume them too.
- **Roving tabindex in TableView** — every clickable cell has `tabIndex={0}`
  so the tab sequence is long. Nice-to-have, not a blocker.
- **MindMapCanvas.tsx** is now ~5000 lines. Extracting subsystems (presence,
  comments, AI panel) would help, but the imperative single-effect pattern
  resists clean splitting.

---

## Memory / preferences

- **Pre-launch autopush** — commit + push to main without asking (no real
  users yet). Revisit when there are.
- **Auto-changelog after user-visible ships** — run `npm run changelog:apply`
  unprompted, hand-tune the drafted entry if the drafter misses the
  headline, commit + push.
- **Autopilot execution** — multi-step tasks run end-to-end without
  confirmation prompts; pause only for genuinely destructive actions.
- **Admin / analytics changes are internal** — don't surface them in the
  user-facing changelog.

---

## Quick reference

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Project overview, stack, conventions, Next 16 gotchas |
| `next.config.js` | Pins `turbopack.root` + redirects squishymind.com → www |
| `lib/types.ts` | `MindMapNode`, `MindMapData`, `Attachment`, `ViewMode`, `Visibility` |
| `lib/canvas-bus.ts` | Typed command bus between Squishy widget and canvas |
| `lib/changelog-data.ts` | Shipped + roadmap entries |
| `lib/admin.ts` | `requireAdmin()` (server) + `requireAdminApi()` (routes) |
| `lib/analytics.ts` | `trackServerEvent()` + `CLIENT_EVENTS` allow-list |
| `lib/track.ts` | Client-side `track('event', { ... })` fire-and-forget |
| `lib/supabase/{client,server,admin}.ts` | Three Supabase clients |
| `app/m/[id]/page.tsx` | Editor route — auth, fetch, defensive guards, role |
| `app/m/[id]/EditorShell.tsx` | Toolbar + view router |
| `components/MindMapCanvas.tsx` | Big imperative DOM canvas (~5000 lines) |
| `components/views/NodeDetailPanel.tsx` | Shared side-drawer for alt views |
| `components/views/{Outline,Tree,Table}View.tsx` | The alt views |
| `components/PageViewTracker.tsx` | Client island to fire a track() on mount |
| `app/admin/*` | Staff section (gated by is_admin) |
| `app/api/admin/*` | Admin mutation routes |
| `app/api/track/route.ts` | Client-event ingestion endpoint |
| `scripts/generate-{delete,brain}-sounds.mjs` | Pre-bake ElevenLabs clips |
| `scripts/draft-changelog.mjs` | Auto-changelog from `git log` |
| `supabase/migrations/*` | 0001 init · 0002 comments · 0003 founder · 0004 admin · 0005 analytics |

For specific details on prior chapters, see commit history and
`lib/changelog-data.ts`.
