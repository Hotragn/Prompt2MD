/**
 * Validates prompt2md/SKILL.md against agent-skill conventions, and the
 * package against the contract `npx prompt2md-skill` depends on. The second
 * half exists because a publish that drops the skill from `files` still
 * installs cleanly and then does nothing — a failure the user only discovers
 * after the package is live.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillPath = join(pkgRoot, "prompt2md", "SKILL.md");
const raw = readFileSync(skillPath, "utf8");
const errors = [];

const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
if (!frontmatter) {
  errors.push("missing YAML frontmatter block (--- ... ---)");
} else {
  const [, yaml, body] = frontmatter;
  const fields = {};
  for (const line of yaml.split(/\r?\n/)) {
    const match = /^(\w+):\s*(.+)$/.exec(line);
    if (match) fields[match[1]] = match[2].trim();
  }

  if (!fields.name) errors.push("frontmatter: `name` is required");
  else if (!/^[a-z0-9-]{1,64}$/.test(fields.name)) errors.push("frontmatter: `name` must be kebab-case, <= 64 chars");

  if (!fields.description) errors.push("frontmatter: `description` is required");
  else {
    if (fields.description.length > 1024) errors.push("frontmatter: `description` must be <= 1024 chars");
    if (!/use when/i.test(fields.description)) errors.push("frontmatter: `description` should state WHEN to use the skill ('Use when ...')");
  }

  if (body.trim().split(/\r?\n/).length < 10) errors.push("body: too short to be useful (< 10 lines)");
  if (!/retrieve_original/.test(body)) errors.push("body: must document the retrieve_original fallback workflow");
}

// --- packaging contract: what `npx prompt2md-skill` needs to exist ---------

const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8"));
const binPath = pkg.bin?.["prompt2md-skill"];

if (binPath === undefined) {
  errors.push("package.json: bin.prompt2md-skill is required for `npx prompt2md-skill`");
} else if (!existsSync(join(pkgRoot, binPath))) {
  errors.push(`package.json: bin points at ${binPath}, which does not exist`);
}

// `files` is an allowlist: anything not covered is silently absent from the
// published tarball, so the installer would ship without the skill it copies.
for (const required of ["bin/", "prompt2md/"]) {
  if (!(pkg.files ?? []).includes(required)) {
    errors.push(`package.json: files must include "${required}" or the published package is incomplete`);
  }
}

if (pkg.private === true) errors.push("package.json: private:true would block publishing");
if (pkg.publishConfig?.access !== "public") {
  errors.push('package.json: publishConfig.access should be "public"');
}

if (errors.length > 0) {
  console.error(`skill package validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}
console.log(`SKILL.md valid; package publishable as ${pkg.name}@${pkg.version}`);
