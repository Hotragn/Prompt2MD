# prompt2md as a startup — the playbook

Written 2026-07-31, grounded in a study of how established open-source
developer-tool companies actually operated, applied to where this project
really is: pre-launch, zero users, one founder, working product with
verifiable claims. Generic startup advice is omitted on purpose — this is the
subset with evidence behind it.

## 1. What the successful ones actually did

**Open source IS the distribution strategy, not a philosophy.** The pattern
across breakout open-source devtools is a permissive-licensed core that earns
developer trust and compounds adoption long before anything is monetized. The
companies that studied their multi-billion-dollar predecessors found that
essentially none monetized in their first five years — adoption was
deliberately put ahead of revenue.

**Ship an embarrassingly early MVP to a technical audience.** The breakout
launches in this category were MVPs shipped weeks after first commit, posted
directly to technical communities, sometimes by users rather than founders.
None waited for polish. prompt2md is already past the bar those launches
cleared.

**Community was the growth engine, not an accessory.** The winners split
messaging by audience — depth and reliability for experts, "get started in
minutes" for newcomers — and grew their first thousand users through radical
transparency: public roadmaps, public handbooks, building in public.

**Launches are a repeatable machine, not an event.** The strongest launch
practice in the category: fixed multi-month cycles, one announcement per day
for a week, features shipped continuously but *marketed* in a concentrated
burst, feature builders writing their own announcement copy, production
deploys frozen a week early, and a written retrospective read aloud at the
next planning meeting. The rule of thumb: **flexible scope, fixed timeline.**

## 2. Business model: decided

**Open core, hosted tier later.** This is the proven model in the category,
and it maps exactly onto what already exists:

| Layer | prompt2md today | Monetizable later |
|---|---|---|
| Core (Apache-2.0, forever free) | CLI, MCP server, skill, engines, compression, retrieval | never — this is the distribution |
| Hosted | studio on Vercel, ephemeral by default | durable retrieval, team workspaces, usage dashboards, SLAs |
| Enterprise | — | SSO, audit logs, private deployment support |

The privacy stance ("no telemetry, local-first, nothing sent to a model unless
you configure a gateway") is not a constraint on this model — it *is* the
enterprise wedge: privacy-conscious organizations adopt tools precisely
because their data never has to transit a third party.

**Do not monetize yet.** Zero users means pricing is fiction. The evidence
says: adoption first, revenue after the habit exists.

## 3. The metrics that matter (and the vanity ones to ignore)

Product-led-growth practice separates **set-up moments → aha moments → habit
moments**, and picks one North Star that predicts retention rather than
flattering the chart.

For prompt2md:

- **Set-up moment** — `pnpm setup` completes; MCP server registered in ≥1 tool.
- **Aha moment** — first conversion where the user sees the token report and
  the savings are real to *their* content.
- **Habit moment** — the `optimize` prompt or CLI used in a normal work session
  without thinking about it.
- **North Star: weekly converted documents** (CLI + MCP + studio combined).
  Not GitHub stars (interest, not usage), not signups (there are none to have),
  not token savings (impressive per-run, says nothing about return usage).

Instrumentation constraint: the product promises no telemetry, so measurement
must come from things users *choose* — GitHub clones/traffic, hosted-studio
server logs (already there, no new tracking), npm downloads once published,
and asking. That is less data than a SaaS gets. It is also the moat; keep it.

## 4. Launch sequence (solo scale)

**T-2 weeks — freeze and verify**
- `pnpm release:gate` green (the one command; see §5)
- Flip repo public → upload social preview → enable Discussions
- Create the Vercel Blob store (durable retrieval on the hosted demo)
- npm publish `@prompt2md/*` + verify `npx` one-liner on a clean machine

**T-1 week — materials, one per audience**
- Technical launch post: leads with the honest-numbers architecture, the
  cut-vs-fold story, and a reproducible benchmark command
- MCP registry + skill directory listings (agent-tools audience)
- One deep-dive post: "how the claims checker keeps our README honest" —
  building-in-public material, and it is genuinely novel

**Launch day**
- Morning: the launch post goes live; be present in comments ALL day — the
  comment thread is the launch
- The repo is the landing page: README first screen = live demo link, install
  one-liner, honest numbers
- Same day: the LLM-tooling communities and MCP forums

**T+1 week — retrospective, written down**
- What was asked repeatedly → docs gaps → fix
- What broke under real traffic → the health monitor (§5) should have caught
  it first; if it didn't, extend the monitor
- Decide the next cycle's single theme

## 5. "No place to fail" — what that honestly means

Failure cannot be eliminated; it can be made **loud, early, and cheap**. The
machine has three layers:

1. **Before merge:** CI — 6 jobs, 173 unit + 13 E2E + real-engine
   integration + claims verification on every push.
2. **Before any release/launch action:** `pnpm release:gate` — one command
   that runs the entire verification surface (build, typecheck, every suite,
   E2E, claims, installer isolation, reliability probes, fresh-clone
   simulation). If it is green, the release is defensible; if it is red, the
   launch waits. No judgement calls at 2am.
3. **After deploy, continuously:** `.github/workflows/health.yml` — scheduled
   probes of the live product (landing page, capabilities, a real conversion
   round-trip, docs site). A failed run is a red workflow + email from GitHub
   before a user files the issue.

What this does NOT cover, said plainly: traffic spikes beyond the hosting
tier, provider-side LLM failures on the hosted demo (deterministic fallback
covers correctness, not delight), and the human parts — comment threads,
support, judgement. Automation buys attention for exactly those.

## 6. Deliberately not doing

- **Pricing page, waitlist, "book a demo"** — theatre without users.
- **A chat community before there is anyone to talk** — GitHub Discussions
  first; graduate when issues outgrow it.
- **Paid marketing, outreach automation, growth hacks** — the roadmap's legal
  guardrails already forbid the spammy versions, and the consistent evidence
  is that devtools grow on product + community, not ads.
- **Analytics SDKs in the product** — the no-telemetry stance is the wedge.
