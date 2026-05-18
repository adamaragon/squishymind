# SquishyMind — Handoff (post v3.2 / v3.3 polish run)

**Branch:** `main` · **Deploy:** auto via Vercel · **Live:** [squishymind.com](https://squishymind.com)
Run `git log --oneline -1` for the current HEAD.

---

## What shipped this session

### Crash fix that unblocked production
- **TDZ in MindMapCanvas** (`/m/[id]` was crashing for everyone with "Cannot access 'ty' before initialization") — `let otherPresence = {}` was declared mid-effect, after `renderAll()` first fires, but `renderAll → renderNodes → applyEditingBadges` reads it. Hoisted the `let` to the top of the effect.
- Added `app/error.tsx` and `app/global-error.tsx` boundaries that surface `error.digest` + message instead of Vercel's generic chrome.

### v3.2 — Views, Dazzled
- **OutlineView**: tree-guide lines, SVG disclosure chevrons (rotated 90° when open), folding subtrees, gradient bullets, multi-line note preview, accent-bar on hover, child-count pill, Expand/Collapse all, paper background with ambient glow.
- **TreeView**: dot-grid Figma background, zoom +/-/Fit, gradient bezier edges (five accent gradients, brighter highlight when selected/hovered), glass cards with accent rail, springy add-child pill, child-count pill, height-aware layout.
- **TableView**: comfy/compact density toggle (real density delta, not 4px), row numbers, color tag column, striped rows, sticky depth-dot header, footer row count.
- All three views share a five-accent palette mapped to `colorIdx` (pink / violet / cyan / sky / amber).

### v3.3 — Notes / images / attachments in every view
- **Shared `NodeDetailPanel`** (`components/views/NodeDetailPanel.tsx`) — side-drawer used by Table / Outline / Tree. Editable label, debounced note textarea, image preview, attachments list with per-type icons (📕 📊 🗄 🎵 🎬), upload buttons, accent-tinted header glow + colour dot, Esc / backdrop-click to close.
- **`Attachment` type** on `MindMapNode`: `{ url, name, type, size? }[]`.
- **`/api/attachments` route** — 10 MB cap, allow-list: PDF / doc / docx / xls / xlsx / ppt / pptx / rtf / zip / gz / tar / 7z / txt / csv / md / json / xml / mp3 / wav / ogg / mp4 / webm / all images.
- **Data-flag pills** on every row/card (`≡ Note · ▣ Image · ◧ N files`) with custom `[data-tip]` CSS tooltips defined in `app/globals.css`.
- **Delete everywhere**:
  - Outline: round × button in meta column on hover
  - Table: trailing 44px actions column with × per row (deletes leaf, with `confirm()`)
  - Tree: × icon chip in row + `⌘⌫` / `⌃⌫` shortcut on focused input
  - Detail panel: "Delete this node and subtree" button at bottom for non-root nodes (all three views wire `onDelete`)

### TableView L1 cleanup
- Dropped L1 column entirely (every row's L1 was the root → redundant). `paths.map(p => p.slice(1)).filter(...)`.
- Root surfaced once in toolbar as a `🧠 RootName` pink-violet gradient breadcrumb pill with ellipsis on long labels.
- Footer reads "Showing N rows · under 'Root Name'".
- Empty-state copy distinguishes "root has no children yet" vs "no map at all".

### Canvas detail card overhaul
- Card now uses a clean dark gradient regardless of underlying node accent (the accent gradient was washing out the title in orange/pink).
- All accent treatments (border, focus ring, top rail, section label rails, note focus border, color-dot halo, action button gradients, scrollbar) reference `var(--accent-c1)` — the node's own colour — so picking a colour swatch updates the modal **live** with a 250 ms transition.
- Card has `max-height: 85vh; overflow-y: auto` + custom accent-tinted scrollbar (8px wide, with `scrollbar-width: thin` for Firefox).
- **Inverse-scaled by `1 / state.zoom`** — the world zooms to ≥1.5× in detail mode, so without this the card was 127vh visible. Set in two places: `renderNodes` (initial) and `applyTransform` (every animation frame). Pattern documented as "world-inside scaled overlays must counter-scale" — see presence cursors for the same trick.
- **Wheel propagation stopped** on `.in-detail`: stage's wheel handler calls `preventDefault()` and converts wheel into canvas zoom, so the card's `overflow:auto` never saw a scroll. `stopPropagation` lets native scroll engage.
- Cleared node `innerHTML` before appending detail content so the node's own label text doesn't show twice above the title input.
- SVG icons in Add image / AI expand / Post buttons (paper-plane for Post) replacing 🖼️ / ✨ / "Post" text.
- Scale-in animation: `detailCardIn` 220 ms cubic-bezier(0.16, 1, 0.3, 1).

### Canvas action chip
- Closer to nodes (yOffset 50/110 → 32/80).
- Three SVG icons consistent with alt views (palette / ⓘ details / × delete) — replacing 🎨 emoji + corner-brackets "expand" glyph + unicode ✕.
- Chip corner radius 24px → 14px, button corners 50% circles → 9px squares (clear container > child hierarchy).
- Hover scale trimmed 1.12 → 1.08.

### AI suggestions batch fix
- `addChild` in a loop without `layoutChildren` was stacking new nodes at the +arc edge of the parent. Added `layoutChildren(parentNode.id)` after the AI panel's add loop. Voice-batch already does this; AI was the only path that forgot.

### Sound system — 40 new clips
- **10 kawaii delete clips** at `public/sfx/delete/0..9.mp3` — Boom / Bye-bye / Pow / Poof / All gone / Sayonara / Bonk / Whoosh / Yeet / Buh-bye. Voice `vr24ecog1HynlBKXovTE`. Rotated on every delete with same-clip-twice suppression.
- **30 brain-click clips** at `public/sfx/brain/{scifi,kawaii,noir}/0..9.mp3`:
  - **scifi** `u2rE0u0hBg9OzDrd9uqZ` — stability 0.75 / style 0.25 (flat, mechanical)
  - **kawaii** `vr24ecog1HynlBKXovTE` — stability 0.25 / style 0.85 (bouncy)
  - **noir** `kAgzhv5JMApdFLmNW1mA` — stability 0.45 / style 0.65 (sultry)
- Canvas builds all 40 Audio elements at mount, flags `_ready` on `canplaythrough`, picks random from ready set with same-clip-twice suppression. Falls back to legacy `aww.mp3` / `ooooh.mp3` if none loaded.
- Generators: `scripts/generate-delete-sounds.mjs` and `scripts/generate-brain-sounds.mjs`. npm scripts: `sfx:delete`, `sfx:brain`.
- `.env.local` carries `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` (main) + `ELEVENLABS_KAWAII_VOICE_ID` + `ELEVENLABS_SCIFI_VOICE_ID` + `ELEVENLABS_NOIR_VOICE_ID`.
- All 40 clips are committed so cloners get them without ElevenLabs creds.

### Home page feature cards
- 9 cards each got a 44×44 gradient-chip SVG icon (speech bubble, 4-grid, avatars, devices, mic, sparkle, wave, palette, trash).
- New `accent` prop on `Feature` (`pink | violet | cyan | amber | emerald`); `ACCENT_STYLE` map holds gradient + glow + inset ring per accent.
- Card hover: 2px lift + brighter border, and the icon chip plays one `@keyframes wobble` pass for a personality moment.

---

## Design patterns to know

### `data-tip="..."` tooltips
Global rule in `app/globals.css`. 200 ms hover delay, dark chip with arrow, `z-index: 200`. Use instead of native `title=` for new buttons/chips. `data-tip-pos="below"` flips it under for buttons pinned to top edges.

### Five-accent palette
```ts
const ACCENT_PALETTE = ['#ec4899', '#8b5cf6', '#06b6d4', '#22d3ee', '#f59e0b'];
```
Declared in each alt view file. `colorIdx % 5` maps the node's colour to one of these.

### `--accent-c1` for live per-node colour
Set inline by `applyNodeColor(el, colorIdx)` in canvas. Anything in the detail panel / canvas DOM that should update when the user picks a colour swatch references `var(--accent-c1)` with `var(--selection)` as fallback for theme accent. Add a transition on `border-color` / `box-shadow` so the swap animates.

### Height-aware tree layout
`cardHeightFor(node, hasChildren, isRoot)` returns the measured height (base 56 + 22 note + 26 meta + 4 root-extra). Layout walk uses a moving `yCursor` for leaves; parents sit at the centre of their children, clamped so a tall parent never extends past its first child's top or its last child's bottom. Edge endpoints use `layout.heights[id]`.

### Inverse-scale + wheel-stop pattern
For any modal-like element that lives **inside** the world layer (which is scaled by `state.zoom`):
1. Set inline transform `translate(-50%, -50%) scale(1/zoom)` with `!important` in both `renderNodes` (initial) and `applyTransform` (per frame).
2. Add `e.stopPropagation()` on `wheel` so the stage's `preventDefault()` wheel-to-zoom handler doesn't hijack scroll.
3. The scrollable element gets `max-height` and `overflow-y: auto`.

This is the same trick presence cursors use to stay visually constant.

---

## Open threads / next things

- **No analytics** — beta is free forever for early signups but conversions aren't tracked.
- **Canvas detail card lacks attachments UI** — the alt views' `NodeDetailPanel` supports attachments, but the canvas's own detail card still only handles image. Stored `attachments` on the node round-trip fine (they're in the JSONB `data` column), they just aren't editable from canvas. Worth unifying with the side-drawer pattern.
- **Voice mode-switching for the agent** — the three new voice IDs (`SCIFI`/`KAWAII`/`NOIR`) are used by the brain-click clip generators today. The actual ElevenLabs agent that talks in conversation still uses `ELEVENLABS_VOICE_ID` (noir). If voice modes become user-selectable in conversation, the agent would consume these.
- **Edge gradients are 0.85 → 0.45 opacity** (bumped from 0.55 → 0.18 for visibility). Very dense maps may want a per-depth fade or hue clustering.
- **`npm run changelog:apply`** reads commits since the last entry's `commit` SHA. v3.3 is the last hand-tuned entry. Run after the next chunk and hand-edit the draft if it's generic.
- **Beta banner** sticky and forever-free promise: any new pricing UI must respect that for accounts created during the banner-up period.

---

## Memory / preferences

- **Pre-launch autopush** — commit + push to main without asking (no real users yet). Revisit when there are.
- **Auto-changelog after user-visible ships** — run `npm run changelog:apply` unprompted, commit + push the result.
- **Autopilot execution** — multi-step tasks run end-to-end without confirmation prompts; pause only for genuinely destructive actions.

---

## Quick reference

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Project overview, stack, conventions, Next 16 gotchas |
| `lib/types.ts` | `MindMapNode`, `MindMapData`, `Attachment`, `ViewMode`, `Visibility` |
| `lib/canvas-bus.ts` | Typed command bus between Squishy widget and canvas (multi-handler, return-undefined-to-decline pattern) |
| `lib/changelog-data.ts` | Shipped + roadmap entries |
| `app/m/[id]/page.tsx` | Editor route — auth, fetch, defensive guards, role resolution |
| `app/m/[id]/EditorShell.tsx` | Toolbar + view router (Canvas / Outline / Tree / Table) |
| `components/MindMapCanvas.tsx` | Big imperative DOM canvas (~4800 lines, single useEffect) |
| `components/views/NodeDetailPanel.tsx` | Shared side-drawer used by all three alt views |
| `components/views/{Outline,Tree,Table}View.tsx` | The alt views |
| `scripts/generate-{delete,brain}-sounds.mjs` | Pre-bake ElevenLabs clips |
| `scripts/draft-changelog.mjs` | Auto-changelog from `git log` |

For specific details on prior chapters (v2.0 → v3.1), see commit history and `lib/changelog-data.ts`.
