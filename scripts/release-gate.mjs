#!/usr/bin/env node
/**
 * The release gate: every verification this project has, as one command.
 *
 *   pnpm release:gate            # full gate (~6-8 min)
 *   pnpm release:gate --fast     # skips the fresh-clone simulation (~3 min)
 *
 * Green means a release/launch action is defensible. Red means it waits.
 * The point is to remove judgement calls under pressure: there is exactly one
 * definition of "ready", it is executable, and it either passes or it does not.
 *
 * Ordered cheap → expensive so failures surface fast.
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FAST = process.argv.includes("--fast");
const isWindows = process.platform === "win32";

const STEPS = [
  { name: "build", cmd: "pnpm", args: ["build"] },
  { name: "typecheck", cmd: "pnpm", args: ["typecheck"] },
  { name: "unit + integration tests", cmd: "pnpm", args: ["test"] },
  { name: "skill definition", cmd: "pnpm", args: ["--filter", "@prompt2md/skill", "lint"] },
  { name: "stated claims match reality", cmd: "pnpm", args: ["check:claims"] },
  { name: "installer isolation (sandboxed HOME)", cmd: "pnpm", args: ["test:install"] },
  { name: "MCP over real stdio", cmd: "node", args: ["packages/hermes-mcp/scripts/verify-stdio.mjs"] },
  { name: "reliability probes (adversarial input)", cmd: "node", args: ["scripts/probe-reliability.mjs"] },
  { name: "browser E2E (landing + studio)", cmd: "pnpm", args: ["--filter", "@prompt2md/web", "test:e2e"] },
  ...(FAST
    ? []
    : [{ name: "fresh-clone new-user simulation", cmd: "node", args: ["scripts/test-fresh-install.mjs"] }]),
];

console.log(`release gate — ${STEPS.length} steps${FAST ? " (fast mode: fresh-clone skipped)" : ""}\n`);

const started = Date.now();
const results = [];

for (const [index, step] of STEPS.entries()) {
  const label = `[${index + 1}/${STEPS.length}] ${step.name}`;
  process.stdout.write(`${label} … `);
  const t0 = Date.now();

  const run = spawnSync(step.cmd, step.args, {
    cwd: REPO,
    // pnpm needs a shell on Windows for .cmd resolution; node does not, and a
    // shell would mangle quoted arguments.
    shell: isWindows && step.cmd === "pnpm",
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
  });

  const seconds = ((Date.now() - t0) / 1000).toFixed(0);
  const ok = run.status === 0;
  results.push({ name: step.name, ok, seconds });
  console.log(ok ? `ok (${seconds}s)` : `FAILED (${seconds}s)`);

  if (!ok) {
    // Show the tail of the failing step — enough to act on, not a log dump.
    const tail = `${run.stdout ?? ""}\n${run.stderr ?? ""}`.trim().split("\n").slice(-25).join("\n");
    console.error(`\n--- ${step.name}: last output ---\n${tail}\n`);
    console.error(`GATE: RED after ${((Date.now() - started) / 1000).toFixed(0)}s — fix the failure above, then re-run.`);
    console.error(`(steps not reached: ${STEPS.slice(index + 1).map((s) => s.name).join(", ") || "none"})`);
    process.exit(1);
  }
}

console.log(`\nGATE: GREEN in ${((Date.now() - started) / 1000).toFixed(0)}s`);
for (const r of results) console.log(`  ok  ${r.name} (${r.seconds}s)`);
console.log("\nEvery verification this project has passes. A release from this commit is defensible.");
