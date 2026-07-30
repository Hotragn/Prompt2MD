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

## 2. The mark

The icon is an **accordion fold seen edge-on**. Its silhouette reads as **M**
(markdown); its geometry is the fold that makes text smaller without losing
any of it. Alternating facets catch light on the front planes and fall into
shadow on the back, which is what makes it read as folded rather than as a
zigzag.

- `apps/web/public/brand-icon.svg` — badge mark, square, for favicons, avatars, tool listings
- `apps/web/public/logo.svg` — horizontal lockup (mark + wordmark + tagline)
- `apps/web/app/icon.svg` — Next.js favicon route

**Rules**
- Minimum size 24 px; below that use the mark with the crease detail removed.
- Never re-colour the facets; never outline; never rotate.
- Clear space on all sides ≥ the badge's corner radius.
- On light surfaces use the mark as-is (the badge carries its own background).

## 3. Palette

Dev tooling has converged on cool near-black (`#0B0E14`-ish slate) with a
violet/cyan gradient. It signals "technical" but no longer distinguishes
anything. Our differentiation is **substrate, not accent**: a warm ink
background with paper grain, which is on-story (paper, folding) and rare in
this category — while the cool brand gradient is retained, because it carries
real recognition equity and because warm accents would collide with the
semantic warning colour.

```
Substrate (warm ink — the differentiator)
  --surface-0  #0B0A0C   page
  --surface-1  #131217   panels
  --surface-2  #1A1820   inset fields, outputs
  --surface-3  #221F2A   raised / hover
  --border     #272430   hairlines
  --border-lit #38334A   focus, active edges

Ink (warm off-white, not clinical blue-white)
  --text       #F2EFEA
  --text-muted #9C96A8
  --text-faint #6E6879

Brand (retained equity — identity, never status)
  --brand      #7C5CFF   violet
  --brand-2    #22D3EE   cyan
  --brand-grad linear-gradient(100deg, violet → cyan)

Semantic (status only — never decoration)
  --ok         #4ADE80   savings, success, "within budget"
  --warn       #FBBF24   degraded path, budget exceeded
  --err        #FB7185   failure
```

**Rules**
- Brand gradient marks *identity* (wordmark, primary action, output bar). It
  never encodes status.
- `--ok` green is reserved for **measured savings**. It is the payoff colour;
  spending it elsewhere devalues it.
- Warm ink is never pure black — `#0B0A0C` keeps a red bias so the grain reads
  as paper rather than noise.

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

## 6. Layout

- Shell max-width **1240 px**; the studio is a two-column workbench that
  collapses to one column below 940 px.
- Stats use a **bento grid** — the savings tile spans wider because it is the
  claim the product is making.
- Radii: `--r-sm 8px`, `--r-md 12px`, `--r-lg 16px`, `--r-full 999px`.
- Hairline borders over shadows; one soft shadow (`--shadow-lift`) reserved
  for genuinely raised surfaces.

## 7. What the research changed

Findings from current YC/a16z-backed developer-tool sites, and what we did:

| Finding | Our response |
|---|---|
| Dark hero is a saturated default, not a differentiator | Kept dark (developers do expect it) but moved to **warm ink + paper grain**; differentiation via substrate |
| Differentiate on the one claim rivals can't make | Hero states losslessness + auditable numbers, not "fast conversion" |
| Warm colour in a cold category (cf. Supabase green) | Warm ink substrate rather than a warm accent, avoiding semantic collision |
| Default sans reads "competent"; distinctive type reads intentional | Serif display, used sparingly |
| Show the product, don't describe it | The studio *is* the landing page — no marketing wrapper |
| Specific quantified claims beat aspirational copy | Every figure on screen comes from a real run |
| Strongest proof is a site built in its own product | The docs corpus is processed by our own pipeline; the digest is generated by it daily |
| Fewer than five nav links, one primary action | Three tabs, one primary button, two nav links |

Sources are listed in `docs/research/UI-LANDSCAPE.md`.
