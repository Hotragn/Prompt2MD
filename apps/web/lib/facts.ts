/**
 * Every number this site states about itself, in one place.
 *
 * These are claims, and claims go stale — the landing page said "126 tests"
 * for a while after the E2E suite grew to 13. So nothing here is trusted:
 * `scripts/check-claims.mjs` re-derives each value from the real thing (runs
 * the suites, runs the pipeline) and fails CI on any drift.
 *
 * If you change a number here, the check will tell you whether you were right.
 */

/** Unit + integration tests. Verified by running the suites, not by counting
 *  `it(` calls — the core package generates cases from the fixture corpus. */
export const UNIT_TESTS = 173;

/** Selenium scenarios across the landing page and the studio. */
export const E2E_TESTS = 13;

export const TOTAL_TESTS = UNIT_TESTS + E2E_TESTS;

/** Tools wired by a single `pnpm setup` run. */
export const SUPPORTED_TOOLS = 6;

/**
 * A real measured conversion, used wherever the site needs a representative
 * figure. Deliberately NOT the Daily Digest number: that run is a summary of
 * raw JSON feeds and reduces to ~2%, which is an outlier and misleading as a
 * headline. See docs/BRAND.md for the full table.
 */
export const SAMPLE_CONVERSION = {
  label: "rambling chat prompt structured into Markdown, no LLM key configured",
  before: 150,
  after: 127,
} as const;
