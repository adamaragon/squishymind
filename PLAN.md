# SquishyMind — full app plan

**Product**: SquishyMind
**Domain**: squishymind.com
**Tagline**: Your brain, but squishier.

This is the architecture and roadmap for turning the standalone HTML prototype into a real, deployable, multi-user web app.

## Stack

- **Next.js 14** (App Router, TypeScript) — the React framework. Handles routing, server-side rendering, API routes, and the build.
- **Supabase** — auth, Postgres database, realtime, row-level security. Their free tier covers our needs through small-community scale.
- **Tailwind CSS** — utility styling, integrates cleanly with the existing canvas CSS.
- **The current canvas** — ported into a React component (`<MindMapCanvas />`) with state lifted up so it can sync to the database.
- **Hetzner CX22 + Caddy** — same hosting model from the AppFlowy plan, except this time we're running our own Next.js app.
- **Optional: Anthropic API** — for the AI "expand this node" feature.

Total monthly cost: ~€5 (Hetzner) + $0 (Supabase free tier) + ~$5–20 (domain + occasional Anthropic API calls). For 20–500 users, well under €10/month.

## Pages & routes

| Route | Auth | Purpose |
|---|---|---|
| `/` | Public | Landing page — pitch, demo gif, sign-up CTA, instructions, FAQ |
| `/signup` | Public | Email + password sign-up |
| `/login` | Public | Email + password sign-in, magic-link fallback |
| `/dashboard` | Required | List of your mind maps — create, rename, delete, set visibility |
| `/m/[id]` | Required (or public if visibility allows) | The editor — current canvas with persistence |
| `/share/[token]` | Public | Read-only view of a shared mind map, with sticky "Sign up to make your own" banner |
| `/account` | Required | Profile, change password, **Delete my account** (one click, no email confirm) |
| `/about`, `/privacy`, `/terms` | Public | Static pages |

## Database schema

```sql
-- One row per user (mirrors auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- One row per mind map
create table mindmaps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade,
  title text default 'Untitled mind map',
  data jsonb not null default '{"nodes":{},"childIndex":{},"rootId":null}',
  visibility text not null default 'private', -- private | unlisted | public
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Collaborators (invited people who can edit or comment)
create table collaborators (
  mindmap_id uuid references mindmaps on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null default 'editor', -- editor | commenter
  invited_at timestamptz default now(),
  primary key (mindmap_id, user_id)
);

-- Row-level security policies enforce who can read/write what
-- (full SQL in supabase/migrations/0001_init.sql when we scaffold)
```

## Permissions model

Three visibility levels per mind map, set by the owner:

- **Private** — only the owner and explicitly invited collaborators can see it. Default. The "totally private" mode you asked for.
- **Unlisted** — anyone with the share link can view (read-only). Not indexed, not in any public list. The Share button produces this kind of URL. Anonymous viewers don't need an account.
- **Public** — anyone can view, appears in the public gallery (optional, off by default).

**Public viewing is anonymous and read-only** — no account needed for someone to follow a share link and see your map. They get the sticky "Sign up to make your own" banner.

For people you actually want signed in and collaborating, two invited roles:

- **Editor** — signed-in user. Can change content, drag nodes, add/remove children. Can't change visibility, delete the map, or invite other people.
- **Commenter** — signed-in user. Can leave threaded comments on any node, can't modify content. Useful for getting feedback from teammates without letting them rearrange the furniture.

The owner is the only one who can change visibility, delete the map, transfer ownership, or invite/remove collaborators.

## Sharing UX

On any mind map, a `Share` button opens a dialog with three options:

1. **Copy link** — generates a `https://squishymind.com/share/<token>` URL. Anyone visiting sees the read-only canvas (no account needed) with a sticky banner: *"Like what you're seeing? Sign up to build your own — it's free."*
2. **Invite by email** — sends an invite (or shows a copy-paste link). Recipients sign up if needed, then land on the map as an Editor or Commenter, depending on what you picked.
3. **Make public** — toggles visibility to public, which adds it to the public gallery.

## Account deletion (your "no email confirm" requirement)

`/account` page has a `Delete account` button. Click → confirmation modal — *"This will delete your account, all your mind maps, and all collaborator invites. This is permanent."* → second click → done. No email round-trip. Supabase's `auth.admin.deleteUser` API + a cascade-delete trigger on the database does the entire cleanup in one transaction.

## Home page

A modest, fast-loading landing page. Sections:

1. **Hero** — animated mini-mind-map (a smaller, lower-impact version of the canvas) with the tagline and a primary CTA.
2. **What it does** — three short paragraphs: "Capture ideas," "Connect them," "Share them."
3. **Features** — the squishy edges, infinite canvas, themes, AI-assist, sharing.
4. **How to use it** — animated GIF or short video walk-through, plus keyboard shortcut cheat-sheet.
5. **FAQ** — privacy, account deletion, pricing, data export.
6. **Footer** — links to /about, /privacy, /terms, GitHub repo.

## Other features I'd recommend

Strong adds that pay for themselves:

- **AI-assist (Claude API)** — *Expand this node* button: select a node, click the spark icon, Claude generates 5–8 child nodes with descriptions. Also *Summarize this subtree* and *Rephrase*. ~$0.001 per call, charge nothing or charge a small fee later.
- **Realtime presence** — Supabase Realtime gives you multi-cursor and "who's editing" indicators almost for free. Live collaboration is the killer feature once two people are in a workspace.
- **Auto-layout** — one button rearranges the whole tree into a clean radial spread. Saves users from a tangled mess.
- **Undo/redo** — `Cmd+Z` / `Cmd+Shift+Z`. Non-negotiable for a real editing tool. Implemented as an action history on the client, synced occasionally to the server.
- **Export** — to PNG (whole canvas), to PDF, to JSON. Lightweight, increases shareability.
- **Templates** — start a new map from a template: brainstorming, project planning, knowledge base, OKRs, decision tree.
- **Comments on nodes** — viewers and editors can leave threaded comments without modifying content. Lower-priority but a strong fit for "feedback from non-editors."
- **Search within a map** — `Cmd+K` opens a quick-find overlay. Indispensable once a map gets dense.
- **Keyboard navigation** — arrow keys traverse the tree (right = first child, left = parent, up/down = siblings). Power-user love.

Things I'd deliberately *not* build for v1:

- **Realtime CRDT-based collaborative editing** (the "two cursors typing on the same node simultaneously" thing). It's gloriously complex and adds a database of edge cases. Last-write-wins per node is fine for v1.
- **File attachments** — adds storage cost and moderation surface area. Defer.
- **Mobile native apps** — the web app should be touch-friendly but a native iOS/Android build is its own project.
- **Custom domains for shared maps** — power-user feature, defer.

## Phased roadmap

**Phase 1 — MVP (1–2 evenings of focused work, with my hand on the wheel)**
- Next.js scaffold with Tailwind, Supabase client wired up
- Auth pages (signup, login, account, delete)
- Database migrations (the schema above)
- Dashboard listing mind maps
- Editor page wrapping the existing canvas, with save-on-debounce to Supabase
- Visibility toggle + share-link flow
- Static home page

**Phase 2 — Polish (a focused weekend)**
- AI-assist via Anthropic API
- Realtime presence (cursors + "X is editing")
- Undo/redo
- Auto-layout button
- Export to PNG/JSON
- Email invite flow (Resend free tier)

**Phase 3 — Nice-to-haves (when bored)**
- Comments
- Templates
- Search
- Public gallery
- Keyboard tree navigation

## What I'd like to do next

If you say go, I'll scaffold Phase 1 as a complete Next.js project — every file, ready to `npm install && npm run dev` locally, then deploy to your Hetzner box with a single Docker compose. You'll be able to sign up, create a mind map, save it, share it, and delete your account end-to-end on Phase 1 alone.

Estimated deliverable size: about 30 source files, ~2000 lines of code total. I'll write each file, you'll copy it into a folder structure I'll specify, then we run two commands.
