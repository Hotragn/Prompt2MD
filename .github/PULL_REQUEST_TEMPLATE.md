## What & why

## Checklist

- [ ] Fixture added/updated for behavior changes (`fixtures/cases/`)
- [ ] ADR added/updated for architectural decisions (`docs/adr/`)
- [ ] `pnpm build && pnpm typecheck && pnpm test` green
- [ ] E2E still green if the studio changed (`pnpm --filter @prompt2md/web test:e2e`)
- [ ] Losslessness preserved: anything summarized carries a working `p2md:src` anchor
- [ ] Savings numbers come from reports, not prose
