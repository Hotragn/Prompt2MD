# Q3 Migration Plan — Decisions (2026-07-21)

## Decisions
- **Cutover strategy: blue/green** (not rolling). Session-stickiness risk accepted; load-balancer drain window mitigates cart-drop concern.
- **Code freeze: 2026-08-14.** Unmerged work slips to Q4.

## Action items
| Owner | Task | Due |
|---|---|---|
| Dana Ortiz | Draft rollback runbook | 2026-08-01 |
| Tom | Size staging environment (needed for capacity review) | 2026-07-24 (Friday) |

## Open risks
- DB migration scripts untested against the prod snapshot (raised by Dana).
- Sticky sessions on old gateway: draining too fast drops carts (raised by Marcus; mitigated by drain window).
