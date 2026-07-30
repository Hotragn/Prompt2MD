#!/usr/bin/env node
/**
 * One-command local setup: registers the prompt2md MCP server with every
 * AI tool detected on this machine and installs the /prompt2md skill.
 *
 *   pnpm setup            # apply to detected tools (configs backed up first)
 *   pnpm setup --dry-run  # show what would change, touch nothing
 *
 * Zero dependencies. Idempotent: safe to re-run. Every modified config gets
 * a timestamped .bak-p2md backup beside it.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveTargets } from "./lib/targets.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const HOME = process.env.P2MD_INSTALL_HOME ?? homedir();
const APPDATA = process.env.P2MD_INSTALL_HOME
  ? join(HOME, "AppData", "Roaming")
  : (process.env.APPDATA ?? join(HOME, "AppData", "Roaming"));
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MCP_BIN = join(REPO, "packages", "hermes-mcp", "dist", "bin.js");
const SKILL_SRC = join(REPO, "packages", "skill", "prompt2md");

const SERVER_SPEC = { command: "node", args: [MCP_BIN] };
const results = [];
const note = (tool, status, detail) => results.push({ tool, status, detail });

function backup(file) {
  if (existsSync(file)) copyFileSync(file, `${file}.bak-p2md-${Date.now()}`);
}

/** Merge mcpServers.prompt2md into a JSON config (created if missing). */
function mergeJsonConfig(tool, configPath) {
  let config = {};
  if (existsSync(configPath)) {
    try {
      // Windows editors often save configs with a UTF-8 BOM — strip it.
      config = JSON.parse(readFileSync(configPath, "utf8").replace(/^﻿/, ""));
    } catch {
      note(tool, "skipped", `${configPath} is not valid JSON — fix it and re-run, or add the snippet manually`);
      return;
    }
  }
  const existing = config.mcpServers?.prompt2md;
  if (existing !== undefined && JSON.stringify(existing) === JSON.stringify(SERVER_SPEC)) {
    note(tool, "ok", "already registered");
    return;
  }
  if (DRY_RUN) {
    note(tool, "would install", `add mcpServers.prompt2md to ${configPath}`);
    return;
  }
  backup(configPath);
  mkdirSync(dirname(configPath), { recursive: true });
  config.mcpServers = { ...(config.mcpServers ?? {}), prompt2md: SERVER_SPEC };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  note(tool, "installed", configPath);
}

/** Append an mcp_servers table to a TOML config (Codex). */
function mergeTomlConfig(tool, configPath) {
  const block = `\n[mcp_servers.prompt2md]\ncommand = "node"\nargs = [${JSON.stringify(MCP_BIN)}]\n`;
  const current = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  if (current.includes("[mcp_servers.prompt2md]")) {
    note(tool, "ok", "already registered");
    return;
  }
  if (DRY_RUN) {
    note(tool, "would install", `append [mcp_servers.prompt2md] to ${configPath}`);
    return;
  }
  backup(configPath);
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, current + block, "utf8");
  note(tool, "installed", configPath);
}

function installSkill() {
  const dest = join(HOME, ".claude", "skills", "prompt2md");
  if (DRY_RUN) {
    note("Claude Code skill", existsSync(dest) ? "ok" : "would install", dest);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(SKILL_SRC, dest, { recursive: true });
  note("Claude Code skill", "installed", `${dest} — invoke with /prompt2md`);
}

function installClaudeCode() {
  const claudeDir = join(HOME, ".claude");
  if (!existsSync(claudeDir)) {
    note("Claude Code", "not detected", "install Claude Code, then re-run");
    return;
  }
  installSkill();
  // Prefer the official CLI for MCP registration; fall back to a snippet.
  if (process.env.P2MD_INSTALL_HOME === undefined) {
    try {
      if (!DRY_RUN) {
        execFileSync("claude", ["mcp", "add", "--scope", "user", "prompt2md", "--", "node", MCP_BIN], {
          stdio: "pipe",
          shell: process.platform === "win32",
        });
      }
      note("Claude Code MCP", DRY_RUN ? "would install" : "installed", "claude mcp add --scope user prompt2md");
      return;
    } catch {
      // CLI unavailable or add failed (e.g. already exists) — fall through.
    }
  }
  note("Claude Code MCP", "manual", `run: claude mcp add --scope user prompt2md -- node "${MCP_BIN}"`);
}

// --- run ---------------------------------------------------------------

if (!existsSync(MCP_BIN)) {
  console.error(`MCP server not built yet (${MCP_BIN} missing).\nRun: pnpm install && pnpm build — then re-run setup.`);
  process.exit(1);
}

installClaudeCode();

// P2MD_INSTALL_PLATFORM lets the test suite exercise macOS/Linux layouts
// from any machine; unset, it is simply the real platform.
const targets = resolveTargets({
  home: HOME,
  appData: APPDATA,
  ...(process.env.P2MD_INSTALL_PLATFORM ? { platform: process.env.P2MD_INSTALL_PLATFORM } : {}),
});

for (const { tool, dir, config, format } of targets) {
  if (!existsSync(dir)) {
    note(tool, "not detected", "skipped");
  } else if (format === "toml") {
    mergeTomlConfig(tool, join(dir, config));
  } else {
    mergeJsonConfig(tool, join(dir, config));
  }
}

// --- report ------------------------------------------------------------

const pad = (s, n) => s.padEnd(n);
console.log(`\nprompt2md setup ${DRY_RUN ? "(dry run — nothing was modified)" : ""}\n`);
for (const r of results) {
  console.log(`  ${pad(r.tool, 20)} ${pad(r.status, 14)} ${r.detail}`);
}

console.log(`
Any other MCP-capable tool (Kimi, Grok clients, VS Code, ...): add this server
to its MCP config — every client uses the same shape:

  { "mcpServers": { "prompt2md": { "command": "node", "args": [${JSON.stringify(MCP_BIN)}] } } }

Model providers (independent of the tool): set these env vars and ANY
OpenAI-compatible endpoint works — Claude, GPT, Gemini, Grok, Kimi, Ollama:

  P2MD_LITELLM_BASE_URL   e.g. http://localhost:4000/v1  (LiteLLM proxy)
  P2MD_MODEL              e.g. claude-sonnet-5 | gemini/gemini-2.5-pro | xai/grok-4 | moonshot/kimi-k2
  P2MD_LITELLM_API_KEY    key for that endpoint

Verify:  node ${join(REPO, "packages", "cli", "dist", "index.js")} doctor`);
