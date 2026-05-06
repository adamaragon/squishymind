# SquishyMind — Claude Code Guide

## Project overview
Mind-mapping web app. Live at **squishymind.com** (also squishymind.vercel.app).
Tagline: "Your brain, but squishier."
Repo: github.com/adamaragon/squishymind
Local: `/Users/adam/Documents/squishy`

## Stack
- **Next.js 16** — App Router, TypeScript. Not Next.js 14 despite PLAN.md saying so.
- **Supabase** — Postgres, Auth, RLS, Realtime
- **Tailwind CSS 3**
- **Vercel** — deployment (Framework Preset: Next.js)
- Anthropic API planned for AI-assist features

## Key Next.js 16 gotchas
- `cookies()` is async — always `await createClient()` on the server side
- `params` is a Promise — `const { id } = await params`
- No `middleware.ts` / `proxy.ts` — we deleted it because `@supabase/ssr` breaks in Edge runtime. Auth is handled per-page: `if (!user) redirect('/login')`
- Session refresh does NOT happen automatically (accepted tradeoff)

## Route structure
| Route | Auth | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/signup` | Public | Sign-up |
| `/login` | Public | Sign-in |
| `/dashboard` | Required | List/manage mind maps |
| `/m/[id]` | Required (or public) | Editor |
| `/share/[token]` | Public | Read-only shared view |
| `/account` | Required | Profile + delete account |

## Database
Tables: `profiles`, `mindmaps`, `collaborators`

Key mindmaps columns: `id`, `owner_id`, `title`, `data` (jsonb), `visibility` (private/unlisted/public), `share_token`, `slug` (unique text, added via migration)

RLS note: collab policies use `auth.uid() = user_id` only — no circular references.

## Auth pattern
```ts
// Server component auth check
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```

## Env vars
`.env.local` for local dev. Vercel env vars must include `NEXT_PUBLIC_SITE_URL=https://squishymind.com`

## Supabase config (production)
- Site URL: `https://squishymind.com`
- Redirect URLs: `https://squishymind.com/**`

## Coding conventions
- Server Components by default; add `'use client'` only when needed
- No extra error handling for impossible states — trust Next.js/Supabase guarantees
- No comments unless the WHY is non-obvious
- Keep components small and colocated with their route

## What's done (v1)
- Full auth flow (signup, login, account deletion)
- Dashboard with create/rename/delete
- Mind map editor with save-on-debounce
- Vanity URL slugs
- Share button + read-only `/share/[token]` view
- Closable instructions panel
- 4-node starter template
- Fullscreen editor iframe

## v2 goals
<!-- Fill this in when you brief Claude on v2 -->

## Do not do
- Do not add `middleware.ts` or `proxy.ts` — breaks Edge runtime with @supabase/ssr
- Do not use synchronous `cookies()` — always await
- Do not mock Supabase in tests — use real DB
