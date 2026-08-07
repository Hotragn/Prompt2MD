#!/usr/bin/env node
/**
 * Installs the /prompt2md agent skill.
 *
 *   npx prompt2md-skill              install for every agent detected
 *   npx prompt2md-skill --dry-run    show what would change, touch nothing
 *   npx prompt2md-skill --project    install into ./.claude/skills instead of the home dir
 *   npx prompt2md-skill --dir <path> install into an explicit skills directory
 *   npx prompt2md-skill --force      overwrite without prompting
 *
 * Zero dependencies, idempotent, and safe to re-run. An existing skill that
 * differs from this one is backed up beside itself before being replaced,
 * never silently overwritten.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ARGV = process.argv.slice(2);
const has = (flag) => ARGV.includes(flag);
const valueOf = (flag) => {
  const i = ARGV.indexOf(flag);
  return i !== -1 ? ARGV[i + 1] : undefined;
};

if (has("--help") || has("-h")) {
  console.log(`
prompt2md-skill — install the /prompt2md agent skill

  npx prompt2md-skill              install for every agent detected
  npx prompt2md-skill --dry-run    show what would change, touch nothing
  npx prompt2md-skill --project    install into ./.claude/skills (this repo only)
  npx prompt2md-skill --dir <path> install into an explicit skills directory
  npx prompt2md-skill --force      replace an existing skill without backing it up

After installing, start a new agent session and run /prompt2md.
`);
  process.exit(0);
}

const DRY_RUN = has("--dry-run");
const FORCE = has("--force");
// P2MD_INSTALL_HOME keeps the test suite out of a real user profile.
const HOME = process.env["P2MD_INSTALL_HOME"] ?? homedir();
const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_SRC = join(PKG, "prompt2md");

if (!existsSync(join(SKILL_SRC, "SKILL.md"))) {
  console.error(`Broken package: ${join(SKILL_SRC, "SKILL.md")} is missing. Please report this at`);
  console.error("https://github.com/Hotragn/Prompt2MD/issues");
  process.exit(1);
}

/**
 * Where skills live. Claude Code reads ~/.claude/skills; a project-local
 * .claude/skills applies to one repo. Other agent runtimes that adopted the
 * same layout work by pointing --dir at their own directory.
 */
function resolveTargets() {
  const explicit = valueOf("--dir");
  if (explicit !== undefined) {
    return [{ agent: "custom", skillsDir: resolve(explicit) }];
  }
  if (has("--project")) {
    return [{ agent: "Claude Code (project)", skillsDir: resolve(".claude", "skills") }];
  }

  const candidates = [
    { agent: "Claude Code", skillsDir: join(HOME, ".claude", "skills"), marker: join(HOME, ".claude") },
    { agent: "Codex CLI", skillsDir: join(HOME, ".codex", "skills"), marker: join(HOME, ".codex") },
  ];

  const detected = candidates.filter((c) => existsSync(c.marker));
  // Nothing detected still installs for Claude Code: creating ~/.claude/skills
  // is harmless, and a first-time user should not have to install the agent
  // first just to stage a skill.
  return detected.length > 0 ? detected : [candidates[0]];
}

/** Compare on content so a re-run of an identical version is a no-op. */
function sameTree(a, b) {
  if (!existsSync(a) || !existsSync(b)) return false;
  const walk = (root) => {
    const out = new Map();
    const visit = (dir, prefix) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
        if (entry.isDirectory()) visit(full, rel);
        else out.set(rel, readFileSync(full, "utf8"));
      }
    };
    visit(root, "");
    return out;
  };
  const left = walk(a);
  const right = walk(b);
  if (left.size !== right.size) return false;
  for (const [k, v] of left) if (right.get(k) !== v) return false;
  return true;
}

const results = [];

for (const { agent, skillsDir } of resolveTargets()) {
  const dest = join(skillsDir, "prompt2md");

  if (existsSync(dest) && sameTree(SKILL_SRC, dest)) {
    results.push({ agent, status: "up to date", detail: dest });
    continue;
  }

  if (DRY_RUN) {
    results.push({ agent, status: existsSync(dest) ? "would replace" : "would install", detail: dest });
    continue;
  }

  // Back up a differing existing copy rather than clobbering it — the user
  // may have edited the skill, and silently discarding that is not ours to do.
  if (existsSync(dest) && !FORCE) {
    const backup = `${dest}.bak-p2md-${Date.now()}`;
    renameSync(dest, backup);
    results.push({ agent, status: "backed up", detail: backup });
  }

  mkdirSync(skillsDir, { recursive: true });
  cpSync(SKILL_SRC, dest, { recursive: true });
  results.push({ agent, status: "installed", detail: dest });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nprompt2md skill ${DRY_RUN ? "(dry run — nothing was modified)" : ""}\n`);
for (const r of results) {
  console.log(`  ${pad(r.agent, 22)} ${pad(r.status, 14)} ${r.detail}`);
}

console.log(`
Start a new agent session, then run:  /prompt2md

The skill works on its own for cleaning up prompts. For document conversion
(PDF, Office, scans) and byte-exact retrieval of compressed sections, add the
engine as well:

  npx prompt2md doctor        check what this machine can already do

Docs: https://prompt2md.vercel.app`);
