---
name: SquishyMind
description: A wobbly, sentient mind-mapping canvas — your brain, but squishier
colors:
  bg-deep: "#0a0b16"
  bg-soft: "#0f1124"
  text-primary: "#e8eaff"
  text-dim: "rgba(232, 234, 255, 0.6)"
  border-subtle: "rgba(255, 255, 255, 0.08)"
  border-strong: "rgba(255, 255, 255, 0.16)"
  accent-violet: "#8b5cf6"
  accent-cyan: "#06b6d4"
  accent-pink: "#ec4899"
  accent-amber: "#f59e0b"
  accent-green: "#10b981"
  glass-bg: "rgba(15, 17, 36, 0.65)"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Inter, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Inter, Segoe UI, sans-serif"
    fontSize: "clamp(3rem, 5vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  prose-body:
    fontSize: "1.0625rem"
    lineHeight: 1.75
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.875em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "linear-gradient(135deg, {colors.accent-violet}, {colors.accent-pink})"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "linear-gradient(135deg, {colors.accent-violet}, {colors.accent-pink})"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  card-glass:
    backgroundColor: "{colors.glass-bg}"
    rounded: "{rounded.xl}"
  input:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "11px 14px"
---

# Design System: SquishyMind

## 1. Overview

**Creative North Star: "The Sentient Brain"**

SquishyMind's interface feels like the inside of a slightly mischievous
pink brain — dark, glowing, a little glassy, and alive with personality.
It's a mind-mapping tool that doesn't take itself seriously: nodes wobble,
confetti fires on task completion, and the voice agent flirts.

The design system balances three tensions:
- **Dark but warm** — the deep navy-black background (`#0a0b16`) is
  offset by pink glow, glass transparency, and soft gradients that keep
  it from feeling cold.
- **Precise but playful** — structural elements (inputs, tables, toolbars)
  are clean and predictable. Decorative elements (brain wobble, flow
  arrows, confetti) add personality.
- **Capable but approachable** — this is a serious tool underneath (26
  voice commands, 5 views, collaboration), but the surface feels like a
  place you'd want to hang out, not operate.

**Key Characteristics:**
- Dark-first: no light mode, by design
- Glass as texture: `.glass` is the default card surface across the
  product. It's purposeful (fits the "inside a brain" metaphor), not
  decorative.
- Five accent colors carry meaning: pink (primary/voice), violet
  (structure), cyan (collaboration), amber (warnings), green (success).
- System fonts for performance and native feel, with JetBrains Mono
  as the code accent.
- Motion is soft and constant: the brain pulses, flow arrows travel,
  cards lift on hover. No bounce easing — exponential ease-out curves
  only.

**Explicitly rejects:** Notion's gray-on-gray minimalism, Miro's
enterprise whiteboard panels, generic SaaS gradient heroes, "eyebrow
kickers" above every section, numbered section markers (01/02/03).

## 2. Colors

A dark, saturated palette built around a deep navy base with five
accent spikes. The palette is intentionally narrow: three primary
accents (pink, violet, cyan) carry most of the color work, with amber
and green reserved for semantic roles.

### Primary
- **Squishy Pink** (`#ec4899`): The voice agent's color. Used for
  primary CTAs, Squishy's speech bubbles, heart/like interactions,
  and the brain icon glow. The most emotionally charged accent.
- **Void Violet** (`#8b5cf6`): Structural/hierarchical elements.
  Used in gradients with pink for primary buttons, timeline markers,
  and the command palette accent.
- **Synapse Cyan** (`#06b6d4`): Collaboration and data. Used for
  collaborator cursors, real-time indicators, and Gallery view
  accents.

### Semantic
- **Amber** (`#f59e0b`): Warnings, timers, attention states.
- **Green** (`#10b981`): Success, task-done states, confetti trigger.

### Neutral
- **Deep Void** (`#0a0b16`): Page background. The darkest surface.
- **Soft Void** (`#0f1124`): Card/section backgrounds, gradient
  endpoints. Slightly lifted from the page.
- **Starlight** (`#e8eaff`): Primary text. Near-white with a subtle
  violet-blue tint that harmonizes with the dark backgrounds.
- **Dim Starlight** (`rgba(232, 234, 255, 0.6)`): Secondary text,
  placeholders, metadata. 60% opacity of the primary text color.
- **Glass** (`rgba(15, 17, 36, 0.65)`): Card/panel surface with
  backdrop-blur. The translucent layer that makes the interface
  feel three-dimensional.

### Named Rules
**The Pink-First Rule.** When in doubt, reach for pink. The voice
agent owns this color, and most emotional/interactive moments trace
back to her. Violet and cyan are supporting actors.

## 3. Typography

**Body Font:** System sans-serif stack (`-apple-system,
BlinkMacSystemFont, Inter, Segoe UI, sans-serif`)
**Code Font:** JetBrains Mono (monospace, for version tags and code
blocks)

**Character:** Clean, native-feeling sans-serif that loads instantly
and reads comfortably on dark backgrounds. No web font overhead.
Personality comes from the brand voice, not the typeface.

### Hierarchy
- **Display** (Bold 700, clamp(3rem, 5vw, 4.5rem), 1.05): Hero
  headings, page titles. Tight tracking (-0.02em) for impact.
- **Headline** (Semibold 600, 1.6rem, 1.25): Section headings on
  marketing pages, blog post h2s.
- **Title** (Semibold 600, 1.25rem, 1.3): Card titles, feature
  headings, sub-section labels.
- **Body** (Regular 400, 1rem, 1.5): Default text. 60% opacity on
  dark backgrounds for secondary content.
- **Label** (Medium 500, 0.75rem—0.875rem, normal): Captions,
  version tags, metadata, button text. Uppercase in tags only.
- **Prose** (1.0625rem, 1.75): Blog/article body. Slightly larger
  and looser for long-form reading.

### Named Rules
**The No-FOUT Rule.** System fonts mean zero layout shift on load.
Keep it that way — no web font dependencies in critical paths.

## 4. Elevation

SquishyMind uses a tonal + glass elevation system. Surfaces aren't
raised with shadows; they're distinguished by background color and
blur. The page is deep void (`#0a0b16`), cards lift to soft void
(`#0f1124`) with glass translucency, and modals/dialogs layer on
top with the same glass treatment + backdrop blur.

**No shadow vocabulary.** Elevation is conveyed through color value
and blur, not shadow. The one exception: the primary button carries
a colored glow (`box-shadow: 0 6px 20px rgba(139, 92, 246, 0.3)`)
that intensifies on hover.

## 5. Components

### Buttons
- **Shape:** 10px radius, inline-flex, centered content
- **Primary:** Pink-to-violet gradient background, white text,
  colored glow shadow. Hover: lifts 1px, glow intensifies.
- **Ghost:** Transparent background, subtle white border, dim
  text. Hover: slight background fill, border brightens.
- **Danger:** Red-tinted background, muted red text, red border.
  Hover: background intensifies.
- **Transition:** All states use 180ms ease-out.

### Cards (`.glass`)
- **Shape:** 16px radius (2xl), 24px padding
- **Surface:** 65% opacity soft-void background, 1px subtle
  border, 14px backdrop blur
- **Hover:** Lifts 1-2px, border brightens to 18% opacity
- **Usage:** Default surface for all cards, panels, dialogs

### Inputs
- **Shape:** 10px radius, full width, 11px/14px v-padding
- **Surface:** 4% white background, subtle border
- **Focus:** Border switches to accent-violet
- **Placeholder:** 60% opacity text color

### Brain Icon
- **Animation:** Gentle breathe keyframe (scale 1→1.04, ±0.5° rotate),
  4s ease-in-out infinite
- **Glow:** Drop-shadow in pink, layered at two intensities
- **Usage:** Hero section, changelog header

### Node (Canvas)
- Per-node color via `var(--accent-c1)` inline custom property
- States: default, selected (ring), hover (lift), done (strikethrough +
  confetti), focused (dimmed surroundings)

## 6. Do's and Don'ts

- **Do** use `.glass` for cards and panels — it's the texture of the
  product
- **Do** reach for pink first; violet and cyan are supporting accents
- **Do** use exponential ease-out curves (quart/quint/expo)
- **Do** keep motion soft and continuous
- **Do** use `var(--text-dim)` for secondary text, not arbitrary grays
- **Don't** use gradient text (`background-clip: text`)
- **Don't** use bounce or elastic easing
- **Don't** use side-tab borders (`border-l-* > 1px` as accent)
- **Don't** add a light mode
- **Don't** use arbitrary z-index values — the system uses semantic
  layers (dropdown → sticky → modal → toast → tooltip)
- **Don't** use more than 2 font families
- **Don't** use AI-typical purple-blue gradients as decoration
