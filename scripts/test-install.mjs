#!/usr/bin/env node
/**
 * Isolated verification of `pnpm setup`. Runs the installer against a
 * throwaway HOME (P2MD_INSTALL_HOME) seeded with realistic pre-existing
 * configs, then proves:
 *
 *   1. every generated config is valid and preserves what was already there
 *   2. the command/args the installer wrote actually launch a working MCP
 *      server (spawned over real stdio, tools listed)
 *   3. the copied skill passes the skill validator
 *   4. re-running is idempotent and creates backups
 *   5. NOTHING outside the sandbox was touched (real configs are hashed
 *      before and after and compared)
 *
 *   node scripts/test-install.mjs
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The MCP SDK is a dependency of the hermes-mcp workspace, not the root.
const requireFromHermes = createRequire(join(REPO, "packages", "hermes-mcp", "package.json"));
const { Client } = await import(
  pathToFileURL(requireFromHermes.resolve("@modelcontextprotocol/sdk/client/index.js")).href
);
const { StdioClientTransport } = await import(
  pathToFileURL(requireFromHermes.resolve("@modelcontextprotocol/sdk/client/stdio.js")).href
);
const INSTALLER = join(REPO, "scripts", "install.mjs");
const REAL_HOME = homedir();

let failures = 0;
const check = (cond, label) => {
  console.log(`${cond ? "ok  " : "FAIL"} ${label}`);
  if (!cond) failures++;
};

/** Real user configs that must never be touched by a sandboxed run. */
const REAL_CONFIG_PATHS = [
  join(REAL_HOME, ".claude", "skills", "prompt2md", "SKILL.md"),
  join(REAL_HOME, ".claude.json"),
  join(REAL_HOME, ".cursor", "mcp.json"),
  join(REAL_HOME, ".codex", "config.toml"),
  join(REAL_HOME, ".gemini", "settings.json"),
  join(process.env.APPDATA ?? join(REAL_HOME, "AppData", "Roaming"), "Claude", "claude_desktop_config.json"),
  join(REAL_HOME, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
];

function fingerprint() {
  const map = {};
  for (const path of REAL_CONFIG_PATHS) {
    map[path] = existsSync(path)
      ? createHash("sha256").update(readFileSync(path)).digest("hex")
      : "<absent>";
  }
  return map;
}

// --- seed a realistic sandbox home ------------------------------------

const sandbox = mkdtempSync(join(tmpdir(), "p2md-install-test-"));
const seed = (relPath, contents) => {
  const full = join(sandbox, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents, "utf8");
  return full;
};

mkdirSync(join(sandbox, ".claude"), { recursive: true });
const cursorCfg = seed(".cursor/mcp.json", '{"mcpServers":{"existing-server":{"command":"keep-me"}}}');
// UTF-8 BOM: how Windows editors commonly save JSON.
const geminiCfg = seed(".gemini/settings.json", `﻿${JSON.stringify({ theme: "dark", mcpServers: {} })}`);
const codexCfg = seed(".codex/config.toml", 'model = "o4"\napproval_policy = "on-request"\n');
const desktopCfg = seed("AppData/Roaming/Claude/claude_desktop_config.json", "{}");

const before = fingerprint();

// --- run the installer twice (second run proves idempotency) ----------

const runInstaller = (args = []) =>
  execFileSync(process.execPath, [INSTALLER, ...args], {
    encoding: "utf8",
    env: { ...process.env, P2MD_INSTALL_HOME: sandbox },
  });

const firstRun = runInstaller();
const secondRun = runInstaller();

// --- 1. configs are valid and preserve prior content ------------------

const cursor = JSON.parse(readFileSync(cursorCfg, "utf8"));
check(cursor.mcpServers["existing-server"]?.command === "keep-me", "cursor: pre-existing server preserved");
check(Array.isArray(cursor.mcpServers.prompt2md?.args), "cursor: prompt2md registered");

const gemini = JSON.parse(readFileSync(geminiCfg, "utf8").replace(/^﻿/, ""));
check(gemini.theme === "dark", "gemini: unrelated settings preserved (BOM file parsed)");
check(gemini.mcpServers.prompt2md !== undefined, "gemini: prompt2md registered");

const desktop = JSON.parse(readFileSync(desktopCfg, "utf8"));
check(desktop.mcpServers.prompt2md !== undefined, "claude desktop: prompt2md registered");

const codex = readFileSync(codexCfg, "utf8");
check(codex.includes('model = "o4"'), "codex: pre-existing keys preserved");
check((codex.match(/\[mcp_servers\.prompt2md\]/g) ?? []).length === 1, "codex: exactly one prompt2md table");
check(/^args = \[".+"\]$/m.test(codex), "codex: args array well formed");

// --- 2. the written command actually launches a working server --------

const client = new Client({ name: "install-test", version: "0.0.1" });
await client.connect(
  new StdioClientTransport({
    command: cursor.mcpServers.prompt2md.command,
    args: cursor.mcpServers.prompt2md.args,
    env: { ...process.env, P2MD_STORE_DIR: join(sandbox, "store") },
    stderr: "ignore",
  }),
);
try {
  const { tools } = await client.listTools();
  const { prompts } = await client.listPrompts();
  check(
    ["convert", "compress_context", "retrieve_original"].every((t) => tools.some((x) => x.name === t)),
    "generated config launches a server exposing all three tools",
  );
  check(prompts.some((p) => p.name === "optimize"), "generated config exposes the optimize prompt");
} finally {
  await client.close();
}

// --- 3. the installed skill is valid ----------------------------------

const skillPath = join(sandbox, ".claude", "skills", "prompt2md", "SKILL.md");
check(existsSync(skillPath), "skill copied into the sandbox home");
const skill = existsSync(skillPath) ? readFileSync(skillPath, "utf8") : "";
check(/^---\r?\nname: prompt2md\b/m.test(skill), "installed skill has valid frontmatter");
check(skill.includes("retrieve_original"), "installed skill documents retrieve_original");

// --- 4. idempotency + backups -----------------------------------------

check(secondRun.includes("already registered"), "second run reports already-registered (idempotent)");
const backups = readdirSync(join(sandbox, ".cursor")).filter((f) => f.includes(".bak-p2md-"));
check(backups.length >= 1, "modified configs were backed up");

// --- 5. nothing outside the sandbox changed ---------------------------

const after = fingerprint();
const touched = Object.keys(before).filter((p) => before[p] !== after[p]);
check(touched.length === 0, `real user configs untouched${touched.length > 0 ? ` (CHANGED: ${touched.join(", ")})` : ""}`);

// --- report -----------------------------------------------------------

rmSync(sandbox, { recursive: true, force: true });
console.log(`\nsandbox: ${sandbox} (removed)`);
console.log(firstRun.split("\n").filter((l) => l.trim().startsWith("Claude") || l.includes("installed")).join("\n"));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall install checks passed — real environment untouched");
