## What & why

<!-- What changes, and what problem it solves. Link the issue if there is one. -->

## Evidence

<!-- Paste the real numbers this change produces or preserves — a token report,
     a savings figure, a test count. "Savings numbers come from reports, not
     prose" is a house rule here, and it applies to pull requests too. -->

## Checklist

- [ ] Fixture added/updated for behaviour changes (`fixtures/cases/`)
- [ ] ADR added/updated for architectural decisions (`docs/adr/`)
- [ ] `pnpm build && pnpm typecheck && pnpm test` green
- [ ] E2E still green if the studio or landing page changed (`pnpm --filter @prompt2md/web test:e2e`)
- [ ] Losslessness preserved: anything summarized carries a working `p2md:src` anchor
- [ ] Savings numbers come from reports, not prose
- [ ] `CHANGELOG.md` updated if this is user-visible

## Anything reviewers should look at closely?

<!-- Trade-offs made, alternatives rejected, or parts you are unsure about. -->
