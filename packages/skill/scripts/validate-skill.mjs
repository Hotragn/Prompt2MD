/** Validates prompt2md/SKILL.md against agent-skill conventions. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const skillPath = join(dirname(fileURLToPath(import.meta.url)), "..", "prompt2md", "SKILL.md");
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

if (errors.length > 0) {
  console.error(`SKILL.md validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}
console.log("SKILL.md valid");
