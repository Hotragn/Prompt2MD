# Brand & UI profile

The design system for prompt2md: the story, the marks, the tokens, and the
rules. Everything here is implemented in `apps/web/app/globals.css` — this
document explains *why*, the CSS is the source of truth for *what*.

## 1. The story: The Fold

Every competitor in this category **cuts**. They truncate, they drop the middle,
they "summarize" and hope you don't need what left. Cutting is destructive and
irreversible — and none of them show you what it cost.

prompt2md **folds**.

> Folding makes something smaller without removing anything from it.
> Unfold it and you have the original, exactly. Cutting is not reversible.
> Folding is.

That is not a metaphor bolted on after the fact — it is literally the
architecture. The original is stored content-addressed *before* any
transformation, every summarized section carries a `p2md:src` anchor, and
`retrieve_original` returns the byte-exact source. The product's central
promise and the brand's central image are the same thing.

Everything downstream follows from it:

| Story element | Product truth | Design consequence |
|---|---|---|
| Folding, not cutting | Lossless compression, anchors, `retrieve_original` | The mark is an accordion fold |
| Paper, not screens | Markdown is text; text is paper | Warm ink substrate + grain texture |
| The ledger | Honest, reproducible token accounting | Numbers are the hero, tabular and large |
| Magic, but shown | "A Markdown Magic" — yet every claim is auditable | Restrained motion; no mystique without proof |

**Tagline:** *A Markdown Magic* (fixed — do not reword).

**Voice:** plain, exact, unhedged. Report numbers, never adjectives about
numbers. "150 → 120 tokens (80%)" — never "dramatically smaller". If a number
isn't measured, it doesn't appear.

### Two claims that must never be blurred

This is the easiest way for this project to become dishonest, and it has
already happened once (the launch image claimed "98.3% saved · LOSSLESS"):

| Claim | What it means | Where it is true |
|---|---|---|
| **Reduction** | The output is smaller than the input | Every run, and the size varies enormously by input |
| **Losslessness** | The *source* is stored and recoverable byte-for-byte | Always — via `p2md:src` anchors and `retrieve_original` |

**Losslessness never means the output retains everything.** A summary
necessarily drops detail from the output; the guarantee is that the detail is
still *retrievable*, not that it is still *present*. Putting a large savings
percentage and the word "lossless" side by side implies the first came free of
the second, which is false.

**Never present a best-case number as typical.** Real measured figures span a
wide range, and the number depends far more on the input than on the tool:

| Input | Measured | Note |
|---|---|---|
| Rambling chat prompt | 150 → 120 tokens (80%) | Deterministic path, no LLM key |
| HTML article fixture | 363 → 257 tokens (71%) | Chrome and nav stripped |
| Markdown doc, budgeted | 1,856 → 1,540 tokens (83%) | `compress --token-budget 500` |
| Daily Digest | 79,497 → 1,363 tokens (2%) | **Selection + summary of raw JSON feeds — not compression of the same content** |

The digest figure is the largest and the least representative: most of the
79,497 is JSON scaffolding nobody wanted, and the output is a curated brief
rather than a smaller version of the input. Quote it only with that label
attached.

## 2. The mark

The icon is an **origami crane**: the fold, made into a figure. Fold a sheet
into a crane and every square millimetre of the paper is still there; unfold
it and you have the original sheet, exactly. That is the product's guarantee
drawn as an object, and it is a symbol no letterform can be mistaken for.

Construction: a flat violet badge, paper-white facets, and crease lines that
are simply the badge showing through the gaps between facets — the fold drawn
in two colours. One dominant wing, a steep neck, a low tail, and a single ink
accent at the beak. The beak kink is what makes the silhouette a crane at a
glance; the dominant wing is what keeps it from reading as a crown at 16 px.
No gradients anywhere, no outline, no ornament: the fold is the whole idea,
and the magic stays in the tagline.

- `apps/web/public/brand-icon.svg` — badge mark, square, for favicons, avatars, tool listings
- `apps/web/public/logo.svg` — horizontal lockup (mark + wordmark + tagline)
- `apps/web/app/icon.svg` — Next.js favicon route

**Rules**
- Minimum size 24 px; below that use the mark with the crease detail removed.
- Never re-colour the facets; never outline; never rotate.
- Clear space on all sides ≥ the badge's corner radius.
- On light surfaces use the mark as-is (the badge carries its own background).

## 3. Palette

Dev tooling has converged on cool near-black with a violet/cyan gradient. It
signals "technical" but no longer distinguishes anything. Our substrate is
**paper**: a warm off-white page with ink text, hairline borders, and one
violet accent used sparingly. Folding happens on paper, and paper is light —
the story and the surface are the same thing. The gradient is retired; the
minimal system is ink pills for primary actions and a single accent for
identity.

```
Substrate (warm paper — the differentiator)
  --surface-0  #FAF9F6   page
  --surface-1  #FFFFFF   panels
  --surface-2  #F4F2ED   inset fields, outputs
  --surface-3  #ECE9E2   raised / hover
  --border     #E7E4DC   hairlines
  --border-lit #CFCAC0   focus, active edges

Ink (warm near-black, never pure black)
  --text       #17151A
  --text-muted #5F5B66
  --text-faint #8B8794

Brand (one accent — identity, never status)
  --brand      #5B3DF5   violet (the only accent; --brand-2 aliases it)

Semantic (status only — never decoration)
  --ok         #15803D   savings, success, "within budget"
  --warn       #B45309   degraded path, budget exceeded
  --err        #DC2626   failure
```

**Rules**
- One accent per page, locked. The violet marks *identity* (wordmark accent,
  active states, the emphasized phrase); it never encodes status.
- Primary actions are ink pills (`--text` on `--surface-1`), not accent
  buttons — high contrast, zero decoration.
- `--ok` green is reserved for **measured savings**. It is the payoff colour;
  spending it elsewhere devalues it.
- Ink is never pure black and paper is never pure white — both keep a warm
  bias so the grain reads as paper rather than noise.

## 4. Type

| Role | Stack | Use |
|---|---|---|
| `--font-ui` | system sans (`ui-sans-serif`, Segoe UI, Roboto…) | all interface text |
| `--font-display` | `ui-serif`, Iowan Old Style, Palatino, Georgia | hero line + tagline **only** |
| `--font-mono` | `ui-monospace`, Cascadia, SF Mono, Menlo | all content: input, output, numerals |

A serif appears almost nowhere in developer tooling, which is exactly why a
*restrained* amount of it signals deliberate design rather than a template.
Used sparingly — the hero sentence and the tagline — it reads as considered.
Used everywhere it would read as a blog. Two families of display serif per
screen is already too much.

All figures use `font-variant-numeric: tabular-nums` so digits don't jitter as
values update.

## 5. Motion

Motion exists to explain change, never to decorate.

- `--t-fast 120ms` — hover, focus, press
- `--t-base 220ms` — panel and state transitions
- `--ease` `cubic-bezier(.2,.7,.3,1)` — a single easing curve everywhere
- Bars animate on value change so a savings drop is *seen*, not just read.
- Everything is wrapped in `prefers-reduced-motion: reduce`, which collapses
  all durations to `0.01ms`. This is not optional.

**Scroll-scrubbed story (GSAP + ScrollTrigger, landing only).** The Fold
chapter (`components/FoldStory.tsx`) ties its animation to scroll position
directly, via a CSS-sticky viewport rather than a ScrollTrigger pin — a
pasted "sheet" fades into the crane facets one at a time as the reader
scrolls, then the crane fades back into a sheet carrying a
`retrieve_original: byte-exact` tag. This is the fold/unfold claim shown as
motion instead of only asserted as a headline. Proof-bar numbers
(`components/Count.tsx`) count up from 0 on first scroll into view for the
same reason bars animate on change: a jump from 0 to 149 is *seen*.

Both are progressive enhancements over a valid static state, never the only
carrier of the claim: the crane's facets and the proof numbers render
correct and final in the base markup, and JS only scatters/zeroes them at
mount before animating back — so a blocked script, a slow connection, or
`prefers-reduced-motion` all land on the same complete page, just without
motion. Chapter markers (`components/Chapter.tsx`, `[ 01 / 06 ]` style) are
static text, not gated on JS at all.

## 6. Layout

- Shell max-width **1240 px**; the studio is a two-column workbench that
  collapses to one column below 940 px.
- Stats use a **bento grid** — the savings tile spans wider because it is the
  claim the product is making.
- Radii: `--r-sm 8px`, `--r-md 12px`, `--r-lg 16px`, `--r-full 999px`.
- Hairline borders over shadows; one soft shadow (`--shadow-lift`) reserved
  for genuinely raised surfaces.

## 7. What the research changed

Findings from a survey of current leading developer-tool sites, and what we did:

| Finding | Our response |
|---|---|
| Dark hero is a saturated default, not a differentiator | Went the other way entirely: **warm paper + ink**, hairline borders, one accent — the light minimalist system the strongest current devtool sites use |
| Differentiate on the one claim rivals can't make | Hero states losslessness + auditable numbers, not "fast conversion" |
| Warm colour in a cold category | Warm ink substrate rather than a warm accent, avoiding semantic collision |
| Default sans reads "competent"; distinctive type reads intentional | Serif display, used sparingly |
| Show the product, don't describe it | The studio *is* the landing page — no marketing wrapper |
| Specific quantified claims beat aspirational copy | Every figure on screen comes from a real run |
| Strongest proof is a site built in its own product | The docs corpus is processed by our own pipeline; the digest is generated by it daily |
| Fewer than five nav links, one primary action | Three tabs, one primary button, two nav links |

Sources are listed in `docs/research/UI-LANDSCAPE.md`.
