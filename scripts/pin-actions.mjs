#!/usr/bin/env node
/**
 * Pin every GitHub Action reference to a commit SHA.
 *
 * A tag is a mutable pointer. `actions/checkout@v4` is whatever the tag points
 * at when the workflow runs, so whoever can move that tag can run code in every
 * job that uses it -- including, here, jobs that hold an LLM API key and
 * security-events: write. A SHA cannot be moved.
 *
 * This exists as a script rather than a one-off edit because pinning is not a
 * task you do once: Dependabot proposes action bumps monthly (see
 * .github/dependabot.yml), and each bump re-introduces a tag that needs
 * resolving. Re-run this after accepting one.
 *
 * The tag is preserved as a trailing comment, which is what makes the pin
 * reviewable -- `@a1b2c3... # v4.2.2` tells you what you approved. Dependabot
 * reads that comment and updates both together.
 *
 * Usage:
 *   node scripts/pin-actions.mjs            # report what would change
 *   node scripts/pin-actions.mjs --write    # apply it
 *
 * Requires `gh` to be authenticated (it resolves refs through the API).
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOWS = join(REPO, ".github", "workflows");
const WRITE = process.argv.includes("--write");

/** owner/repo[/subpath]@ref, plus any existing "# tag" comment to replace. */
const USES = /^(\s*(?:-\s+)?uses:\s*)([\w.-]+\/[\w.-]+(?:\/[\w./-]+)?)@([^\s#]+)(\s*#.*)?$/;
const ALREADY_PINNED = /^[0-9a-f]{40}$/;

const cache = new Map();

/**
 * Resolve a ref to its commit SHA.
 *
 * No shell: the ref comes out of a file, and concatenating it into a command
 * string would make a workflow edit into a command injection. execFileSync with
 * an argument array cannot be talked into running something else.
 */
function resolveSha(repo, ref) {
  const key = `${repo}@${ref}`;
  if (cache.has(key)) return cache.get(key);
  let sha;
  try {
    sha = execFileSync("gh", ["api", `repos/${repo}/commits/${ref}`, "--jq", ".sha"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    const detail = err instanceof Error ? err.message.split("\n")[0] : String(err);
    throw new Error(`could not resolve ${key} (${detail})`);
  }
  if (!ALREADY_PINNED.test(sha)) {
    throw new Error(`${key} resolved to something that is not a commit sha: ${sha}`);
  }
  cache.set(key, sha);
  return sha;
}

let changed = 0;
let pinned = 0;
let failed = 0;

for (const name of readdirSync(WORKFLOWS).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))) {
  const path = join(WORKFLOWS, name);
  const lines = readFileSync(path, "utf8").split("\n");
  let touched = false;

  for (const [i, line] of lines.entries()) {
    const match = USES.exec(line);
    if (match === null) continue;

    const [, prefix, repo, ref] = match;

    // Local composite actions (./.github/actions/x) have nothing to pin.
    if (repo.startsWith(".")) continue;

    if (ALREADY_PINNED.test(ref)) {
      pinned += 1;
      continue;
    }

    try {
      const sha = resolveSha(repo, ref);
      lines[i] = `${prefix}${repo}@${sha} # ${ref}`;
      touched = true;
      changed += 1;
      console.log(`  ${name}: ${repo}@${ref} -> ${sha.slice(0, 12)}…`);
    } catch (err) {
      failed += 1;
      console.error(`  ${name}: FAILED ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (touched && WRITE) writeFileSync(path, lines.join("\n"), "utf8");
}

console.log("");
console.log(`${changed} reference(s) to pin, ${pinned} already pinned, ${failed} unresolved`);

if (failed > 0) {
  console.error("Some references could not be resolved — nothing was guessed. Fix those and re-run.");
  process.exit(1);
}
if (changed > 0 && !WRITE) {
  console.log("Dry run. Re-run with --write to apply, then commit the workflow files.");
}
