# SquishyMind — deployment guide

This is the Next.js application for [squishymind.com](https://squishymind.com). Roughly 30 minutes from cloning to live site, including coffee.

## What you're deploying

- **Next.js 14** (App Router) with Tailwind
- **Supabase** for auth + Postgres database (free tier)
- **Vercel** for hosting (free tier)
- **Your domain** at any registrar (~$11/year)

Total ongoing cost: about **$1/month** (just the domain).

## Prerequisites

Three accounts. None of them charge anything for what we need.

1. **Supabase** — [supabase.com](https://supabase.com) → sign up
2. **Vercel** — [vercel.com](https://vercel.com) → sign up (use GitHub)
3. **A domain registrar** — [Porkbun](https://porkbun.com) or [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) recommended. Register `squishymind.com` (or your chosen domain) before continuing.

You'll also need:
- **Node.js 20+** locally — `node -v` to check. If missing, install from [nodejs.org](https://nodejs.org).
- **Git** — for pushing to GitHub (optional but easier).

---

## Step 1 — Set up Supabase (5 min)

1. Sign in to [supabase.com](https://supabase.com) and click **New project**.
2. Pick a name (e.g. "squishymind"), set a strong database password (save it somewhere — you might need it later), choose the region closest to your users, click **Create new project**. Wait ~1 minute.
3. Once provisioned, go to **Project Settings → API** in the sidebar. You need two values:
   - **Project URL** (looks like `https://abc123xyz.supabase.co`)
   - **anon public** key (a long `eyJ…` string)

   Keep this tab open — you'll paste these in a moment.

4. Now go to **SQL Editor → New query**. Open `supabase/migrations/0001_init.sql` from this project, copy its entire contents, paste into the SQL editor, click **Run**. You should see "Success. No rows returned" — that means the schema, triggers, and policies are in place.

5. Go to **Authentication → Providers** and confirm **Email** is enabled. By default Supabase requires email confirmation; for instant signups (no email round-trip), turn off **Confirm email** under **Email Auth settings**. (Recommended for v1; you can re-enable later.)

## Step 2 — Local dev (5 min)

```bash
cd squishymind
npm install
cp .env.example .env.local
```

Open `.env.local` in your editor and paste in the Supabase values from step 1:

```
NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then:

```bash
npm run dev
```

Visit `http://localhost:3000`. You should see the landing page. Click **Sign up free**, create an account, you'll land in the dashboard. Click **+ New map** and you'll get to the editor (the prototype canvas, working with localStorage save).

If something goes wrong, the terminal will tell you what.

## Step 3 — Push to GitHub (3 min, optional but recommended)

```bash
git init
git add .
git commit -m "SquishyMind v1"
gh repo create squishymind --public --source=. --push
```

If you don't have the `gh` CLI, just create a new empty repo on github.com and follow the instructions to push. If you'd rather skip Git entirely, the next step lets you deploy from your local folder.

## Step 4 — Deploy to Vercel (5 min)

**With GitHub (recommended):**

1. Go to [vercel.com](https://vercel.com) → **Add New… → Project**.
2. Import your `squishymind` repo. Vercel auto-detects Next.js — accept defaults.
3. Expand **Environment Variables** and add the same three values from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` — set to `https://squishymind.com` (or whatever you registered)
4. Click **Deploy**. Wait ~1 minute. You'll get a `something.vercel.app` URL — visit it to confirm.

**Without GitHub:**

```bash
npm install -g vercel
vercel login
vercel        # follow prompts; it'll deploy from the local folder
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SITE_URL
vercel --prod
```

## Step 5 — Custom domain (5 min)

1. In Vercel: **Project → Settings → Domains → Add**. Type `squishymind.com`.
2. Vercel will show you the DNS records to add. Usually:
   - An **A record** at `@` pointing to `76.76.21.21`
   - A **CNAME** at `www` pointing to `cname.vercel-dns.com`
3. Go to your registrar (Porkbun, Cloudflare, etc.) and add those DNS records exactly as Vercel shows them. **TTL: 300 seconds** is fine.
4. Back in Vercel, click **Refresh** until the domain shows as verified (usually 1–10 minutes for fresh DNS).
5. Vercel will issue a free Let's Encrypt cert automatically. `https://squishymind.com` should work within a few minutes.

## Step 6 — Update Supabase redirect URLs (2 min)

Now that the site has a real URL, tell Supabase about it:

1. **Supabase → Authentication → URL Configuration**.
2. **Site URL**: `https://squishymind.com`
3. **Redirect URLs**: add `https://squishymind.com/auth/callback` (and keep `http://localhost:3000/auth/callback` for local dev).
4. Save.

## Step 7 — Update the SITE_URL env var (1 min)

In **Vercel → Settings → Environment Variables**, change `NEXT_PUBLIC_SITE_URL` to `https://squishymind.com`. Then trigger a redeploy: **Deployments → … → Redeploy**.

## Done

Visit `https://squishymind.com`. Sign up. Create a map. You have a real product on the internet.

---

## What's working in v1

- Landing page with hero and feature highlights
- Email + password signup and login
- Protected dashboard listing your maps
- Create / open / delete maps
- Editor (the prototype canvas, working via iframe; persists to your browser's localStorage)
- Account page with Sign out and Delete account
- Public share URL via `share_token` (read-only viewer with sign-up nudge)

## What's coming in the next iteration

- The canvas ported to a true React component
- Server-synced editing (saves to Supabase, accessible from any device)
- Real-time presence (multi-cursor + "X is editing")
- Visibility toggle UI on the editor (private / unlisted / public switch)
- Email invites for collaborators
- Image attachments on nodes
- AI expand button via the Anthropic API

## Common stumbling blocks

**`npm install` fails with EACCES** — make sure Node 20+ is installed (`node -v`). If you have multiple Node versions, use `nvm use 20`.

**Signup says "User already registered"** — that email already has an account. Use `/login` or click "forgot password".

**"Failed to fetch" on signup** — your `NEXT_PUBLIC_SUPABASE_URL` env var is missing or wrong. Double-check `.env.local` (or Vercel → Environment Variables) has no trailing slash.

**Custom domain stuck "Pending"** — DNS hasn't propagated. Wait 10 minutes, retry. If it persists, run `dig +short squishymind.com` from your terminal — should return `76.76.21.21` (or whatever Vercel showed).

**Email confirmation links 404** — the redirect URL in Supabase doesn't match. **Authentication → URL Configuration**, add your domain.

**Anything else** — paste the error and I'll diagnose.
