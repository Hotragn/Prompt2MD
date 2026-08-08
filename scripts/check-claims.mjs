#!/usr/bin/env node
/**
 * Verify every number the project states about itself.
 *
 * The README, the landing page, and BRAND.md all quote figures. Figures go
 * stale silently — the landing page claimed "126 tests" for several commits
 * after the E2E suite grew to 13, and nothing caught it. This does.
 *
 * Each claim is re-derived from the real thing:
 *   - test counts by RUNNING the suites (the core package generates cases from
 *     the fixture corpus, so counting `it(` calls under-reports by ten)
 *   - token figures by running the actual pipeline
 *
 *   node scripts/check-claims.mjs
 *
 * Turbo caches `pnpm test`, so re-running it here after the CI test step is
 * effectively free.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, {
    cwd: REPO,
    encoding: "utf8",
    shell: isWindows,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });

/** Read the declared facts without needing a TS toolchain. */
function declaredFacts() {
  const src = readFileSync(join(REPO, "apps", "web", "lib", "facts.ts"), "utf8");
  const num = (name) => {
    const m = new RegExp(`export const ${name} = (\\d+)`).exec(src);
    if (m === null) throw new Error(`facts.ts is missing ${name}`);
    return Number(m[1]);
  };
  const sample = /before: (\d+),\s*after: (\d+)/.exec(src);
  if (sample === null) throw new Error("facts.ts is missing SAMPLE_CONVERSION");
  return {
    unitTests: num("UNIT_TESTS"),
    e2eTests: num("E2E_TESTS"),
    supportedTools: num("SUPPORTED_TOOLS"),
    sampleBefore: Number(sample[1]),
    sampleAfter: Number(sample[2]),
  };
}

const facts = declaredFacts();

// --- 1. unit tests: run them, do not count them ------------------------

console.log("running unit suites (turbo-cached)…");
const testOut = run("pnpm", ["test"]);
const unitActual = [...testOut.replace(/\[[0-9;]*m/g, "").matchAll(/Tests\s+(\d+) passed/g)]
  .map((m) => Number(m[1]))
  .reduce((a, b) => a + b, 0);

check(
  unitActual === facts.unitTests,
  "UNIT_TESTS matches the suites",
  `declared ${facts.unitTests}, actual ${unitActual}`,
);

// --- 2. e2e tests -------------------------------------------------------

// Safe to count statically: the E2E specs declare every case literally, with
// no generated or skipped tests. Asserted below so that stays true.
//
// Discovered by reading the directory, NOT from a hardcoded list. The first
// version listed ["landing.e2e.ts", "studio.e2e.ts"] by name, so when
// cursor.e2e.ts was added the checker kept counting 13 of 15 and reported
// success — a guard that cannot see a new file is not a guard. Any spec added
// here is now counted automatically.
const E2E_DIR = join(REPO, "apps", "web", "e2e");
const e2eFiles = readdirSync(E2E_DIR).filter((f) => f.endsWith(".e2e.ts"));
const e2eSources = e2eFiles.map((f) => readFileSync(join(E2E_DIR, f), "utf8"));
const e2eActual = e2eSources.reduce((n, s) => n + (s.match(/^\s*it\(/gm) ?? []).length, 0);
const e2eDynamic = e2eSources.some((s) => /it\.each|it\.skip|it\.only|it\.todo/.test(s));

check(!e2eDynamic, "E2E specs stay statically countable (no .each/.skip/.only)");
check(
  e2eActual === facts.e2eTests,
  "E2E_TESTS matches the specs",
  `declared ${facts.e2eTests}, actual ${e2eActual}`,
);

// --- 3. the representative conversion figure ---------------------------

const RAMBLING =
  'ok so what i need is basically a python script that takes a folder of csv files and merges them but ONLY the ones that have a "date" column, and also it should skip empty files. oh and the output should be a single parquet file. also please use pandas. actually it also needs to handle dates in different formats, some are MM/DD/YYYY and some are ISO. like i said merge them all into one parquet. also add logging. did i mention to skip empty files? yeah skip those. one more thing - if a file fails to parse dont crash, just log it and continue. use pandas like i said. thanks!!! also python 3.11';

let conversion;
try {
  const cli = join(REPO, "packages", "cli", "dist", "index.js");
  // No shell: the sample contains embedded quotes, which cmd.exe would mangle.
  const out = run("node", [cli, "convert", "--text", RAMBLING, "--json"], { shell: false });
  conversion = JSON.parse(out);
} catch (err) {
  check(false, "sample conversion runs", err instanceof Error ? err.message.slice(0, 120) : "failed");
}

if (conversion !== undefined) {
  const { inputTokens, outputTokens } = conversion.report;
  check(
    inputTokens === facts.sampleBefore && outputTokens === facts.sampleAfter,
    "SAMPLE_CONVERSION matches a real run",
    `declared ${facts.sampleBefore}→${facts.sampleAfter}, actual ${inputTokens}→${outputTokens}`,
  );
  check(
    outputTokens < inputTokens,
    "the representative figure actually shrinks",
    `${Math.round((outputTokens / inputTokens) * 100)}% of input`,
  );
}

// --- 3b. the compress figure quoted in README and BRAND -----------------

// These went stale twice: once when ARCHITECTURE.md itself changed, once when
// the compressor's layout fix moved the output. Both times the docs kept
// quoting a run that no longer existed, under a heading promising every number
// comes from a real command. Derive them instead of trusting them.
let compression;
try {
  const cli = join(REPO, "packages", "cli", "dist", "index.js");
  const out = run("node", [cli, "compress", join(REPO, "ARCHITECTURE.md"), "--token-budget", "500", "--json"], {
    shell: false,
  });
  compression = JSON.parse(out);
} catch (err) {
  check(false, "compress sample runs", err instanceof Error ? err.message.slice(0, 120) : "failed");
}

if (compression !== undefined) {
  const { rawTokens, compressedTokens, cache } = compression.savings;
  const effective = cache.effectiveTokensPerSubsequentCall;
  const group = (n) => n.toLocaleString("en-US");

  const quoted = /compressed (\d+)→(\d+) tokens/.exec(readFileSync(join(REPO, "README.md"), "utf8"));
  check(
    quoted !== null && Number(quoted[1]) === rawTokens && Number(quoted[2]) === compressedTokens,
    "README compress example matches a real run",
    quoted === null
      ? "no compress example found"
      : `quoted ${quoted[1]}→${quoted[2]}, actual ${rawTokens}→${compressedTokens}`,
  );

  const brand = readFileSync(join(REPO, "docs", "BRAND.md"), "utf8");
  check(
    brand.includes(`${group(rawTokens)} → ${group(compressedTokens)}`),
    "BRAND budgeted row matches a real run",
    `actual ${group(rawTokens)} → ${group(compressedTokens)}`,
  );
  check(
    brand.includes(`${group(rawTokens)} → ${effective} effective`),
    "BRAND repeat-call row matches a real run",
    `actual ${group(rawTokens)} → ${effective} effective`,
  );
}

// --- 4. supported tools -------------------------------------------------

const targets = readFileSync(join(REPO, "scripts", "lib", "targets.mjs"), "utf8");
// resolveTargets covers the config-file tools; Claude Code is wired separately
// through its own CLI, so it is not in that list.
const toolsActual = (targets.match(/tool: "/g) ?? []).length + 1;
check(
  toolsActual === facts.supportedTools,
  "SUPPORTED_TOOLS matches the installer",
  `declared ${facts.supportedTools}, actual ${toolsActual}`,
);

// --- 5. prose repeating those numbers ----------------------------------

const readme = readFileSync(join(REPO, "README.md"), "utf8");
const badge = /tests-(\d+)%20unit%20%2B%20(\d+)%20e2e/.exec(readme);
check(badge !== null, "README carries a test badge");
if (badge !== null) {
  check(
    Number(badge[1]) === unitActual && Number(badge[2]) === e2eActual,
    "README badge matches reality",
    `badge ${badge[1]}+${badge[2]}, actual ${unitActual}+${e2eActual}`,
  );
}

const devLine = /pnpm test\s+# (\d+) unit/.exec(readme);
check(
  devLine === null || Number(devLine[1]) === unitActual,
  "README development section matches reality",
  devLine === null ? "no count stated" : `stated ${devLine[1]}, actual ${unitActual}`,
);

// --- 6. the honesty rule ------------------------------------------------

// Reduction and losslessness are different claims. Pairing a savings
// percentage with the word "lossless" implies the first came free of the
// second. This has happened once already, on the launch image.
for (const file of ["apps/web/public/og.svg", "apps/web/app/page.tsx", "README.md"]) {
  const text = readFileSync(join(REPO, file), "utf8");
  const offending = text
    .split(/\n/)
    .filter((line) => /lossless/i.test(line) && /\d{2,3}(\.\d+)?\s*%/.test(line));
  check(offending.length === 0, `no "N% lossless" claim in ${file}`, offending[0]?.trim().slice(0, 80) ?? "");
}

// Markdown syntax COSTS tokens (~5-15% on clean prose); the saving comes from
// stripping markup, removing redundancy, and summarizing. Copy that credits the
// format itself is the single most tempting false claim this project can make,
// because the product is named after the format. See docs/BRAND.md §1.
// The gaps after "Markdown" forbid commas on purpose. A comma means a LIST
// ("convert a document to Markdown, reduce token usage" — two separate things
// a user might ask for), while a causal claim runs straight through
// ("convert to Markdown to save tokens"). The first version of this check
// allowed commas and flagged SKILL.md's trigger-phrase list as a false claim.
const FORMAT_CLAIM =
  /(convert(ing)?|turn(ing)?|switch(ing)?)[^.\n]{0,40}\b(to|into)\s+m(ark)?d(own)?\b[^.,\n]{0,20}\b(saves?|reduces?|cuts?|fewer|less)\b[^.,\n]{0,15}\btokens?\b/i;
for (const file of [
  "README.md",
  "apps/web/app/page.tsx",
  "apps/web/app/layout.tsx",
  "packages/skill/README.md",
  "packages/skill/prompt2md/SKILL.md",
  "docs/index.md",
]) {
  const text = readFileSync(join(REPO, file), "utf8");
  const offending = text.split(/\n/).filter((line) => FORMAT_CLAIM.test(line));
  check(
    offending.length === 0,
    `no "Markdown itself saves tokens" claim in ${file}`,
    offending[0]?.trim().slice(0, 80) ?? "",
  );
}

// --- report -------------------------------------------------------------

if (failures > 0) {
  console.error(`\n${failures} claim(s) are wrong. Fix the number or fix the code.`);
  process.exit(1);
}
console.log("\nevery stated number matches reality");
