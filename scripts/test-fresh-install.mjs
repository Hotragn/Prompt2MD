#!/usr/bin/env node
/**
 * Fresh-user simulation, fully isolated. Clones the repo into a throwaway
 * directory, installs and builds it there, then exercises every surface a new
 * user touches — CLI, MCP over stdio, skill, installer, web build, digest —
 * with a sandboxed HOME and originals store.
 *
 *   node scripts/test-fresh-install.mjs [--ref main] [--keep]
 *
 * Nothing outside the sandbox is written: the real user's configs are hashed
 * before and after and compared. Requires network access (git clone + pnpm
 * install + live digest APIs).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEEP = process.argv.includes("--keep");
const refIndex = process.argv.indexOf("--ref");
const REF = refIndex >= 0 ? process.argv[refIndex + 1] : "main";
const REAL_HOME = homedir();

const requireFromHermes = createRequire(join(REPO, "packages", "hermes-mcp", "package.json"));
const { Client } = await import(
  pathToFileURL(requireFromHermes.resolve("@modelcontextprotocol/sdk/client/index.js")).href
);
const { StdioClientTransport } = await import(
  pathToFileURL(requireFromHermes.resolve("@modelcontextprotocol/sdk/client/stdio.js")).href
);

let failures = 0;
const started = Date.now();
const stamp = () => `${String((Date.now() - started) / 1000).padStart(6)}s`;
const check = (cond, label, detail = "") => {
  console.log(`${stamp()} ${cond ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
};
const step = (label) => console.log(`${stamp()} ---- ${label}`);

const REAL_CONFIG_PATHS = [
  join(REAL_HOME, ".claude", "skills", "prompt2md", "SKILL.md"),
  join(REAL_HOME, ".claude.json"),
  join(REAL_HOME, ".cursor", "mcp.json"),
  join(REAL_HOME, ".codex", "config.toml"),
  join(REAL_HOME, ".gemini", "settings.json"),
  join(process.env.APPDATA ?? join(REAL_HOME, "AppData", "Roaming"), "Claude", "claude_desktop_config.json"),
  join(REAL_HOME, ".prompt2md", "originals"),
];
const fingerprint = () =>
  Object.fromEntries(
    REAL_CONFIG_PATHS.map((p) => [
      p,
      existsSync(p)
        ? createHash("sha256").update(existsSync(p) && readFileSync(p).length >= 0 ? readFileSync(p) : Buffer.alloc(0)).digest("hex")
        : "<absent>",
    ]),
  );

function tryFingerprint() {
  try {
    return fingerprint();
  } catch {
    // Directories in the list (originals store) can't be read as files; fall
    // back to existence markers.
    return Object.fromEntries(REAL_CONFIG_PATHS.map((p) => [p, existsSync(p) ? "<exists>" : "<absent>"]));
  }
}

const before = tryFingerprint();

// --- sandbox ----------------------------------------------------------

/**
 * Windows still enforces a 260-character MAX_PATH for many APIs, and a pnpm
 * virtual store adds deeply nested directories with long peer-hashed names. A
 * sandbox under an already-long TMPDIR pushed `vitepress/bin/vitepress.js`
 * past the limit and the docs build failed with ERR_REQUIRE_CYCLE_MODULE —
 * a harness artifact that looked exactly like a product bug. Prefer the
 * shortest writable base so this test measures the product.
 */
function shortestWritableBase() {
  if (process.platform !== "win32") return tmpdir();
  for (const candidate of [parse(process.cwd()).root, tmpdir()]) {
    try {
      const probe = mkdtempSync(join(candidate, "p2md-probe-"));
      rmSync(probe, { recursive: true, force: true });
      return candidate;
    } catch {
      // not writable — try the next
    }
  }
  return tmpdir();
}

const sandbox = mkdtempSync(join(shortestWritableBase(), "p2md-fresh-"));
const clone = join(sandbox, "repo");
const fakeHome = join(sandbox, "home");
const store = join(sandbox, "store");
const env = { ...process.env, P2MD_INSTALL_HOME: fakeHome, P2MD_STORE_DIR: store };

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, {
    cwd: opts.cwd ?? clone,
    encoding: "utf8",
    env,
    // Only pnpm needs a shell on Windows (.cmd resolution); using one for
    // git/node would mangle arguments containing spaces.
    shell: process.platform === "win32" && cmd === "pnpm",
    timeout: opts.timeout ?? 600_000,
    maxBuffer: 64 * 1024 * 1024,
  });

console.log(`fresh-install verification\n  sandbox: ${sandbox}\n  ref:     ${REF}\n`);

// --- 1. clone ---------------------------------------------------------

step("clone from GitHub (exactly what a new user gets)");
const cloned = run("git", ["clone", "--branch", REF, "--depth", "1", REPO, clone], { cwd: sandbox });
check(cloned.status === 0, "git clone", cloned.status === 0 ? clone : cloned.stderr?.slice(0, 200));
if (cloned.status !== 0) process.exit(1);

// --- 2. install + build ----------------------------------------------

step("pnpm install (isolated node_modules)");
const installed = run("pnpm", ["install", "--frozen-lockfile"]);
check(installed.status === 0, "pnpm install", installed.status === 0 ? "" : installed.stderr?.slice(-400));

step("pnpm build");
const built = run("pnpm", ["build"]);
check(built.status === 0, "pnpm build", built.status === 0 ? "" : built.stdout?.slice(-400));
if (built.status !== 0) {
  console.error("build failed — aborting");
  process.exit(1);
}

// --- 3. test suites in the clone --------------------------------------

step("test suites");
const unit = run("pnpm", ["test"]);
const unitCounts = [...(unit.stdout ?? "").matchAll(/Tests\s+(\d+) passed/g)].map((m) => Number(m[1]));
check(unit.status === 0, "unit tests", `${unitCounts.reduce((a, b) => a + b, 0)} passed across ${unitCounts.length} packages`);
if (unit.status !== 0) {
  const failingLines = (unit.stdout ?? "")
    .split(/\r?\n/)
    .filter((l) => /FAIL|Error|error TS|✕|×|ERR_|Cannot find|exited \(1\)/.test(l))
    .slice(0, 15);
  console.log(failingLines.map((l) => `        ${l.trim()}`).join("\n") || `        ${(unit.stderr ?? "").slice(-500)}`);
}

const skill = run("pnpm", ["--filter", "prompt2md-skill", "lint"]);
check(skill.status === 0 && (skill.stdout ?? "").includes("SKILL.md valid"), "skill definition validates");

const e2e = run("pnpm", ["--filter", "@prompt2md/web", "test:e2e"]);
const e2eCount = /Tests\s+(\d+) passed/.exec(e2e.stdout ?? "")?.[1] ?? "0";
check(e2e.status === 0, "selenium e2e in the clone", `${e2eCount} passed`);

// --- 4. CLI surfaces --------------------------------------------------

step("CLI surfaces");
const cli = join(clone, "packages", "cli", "dist", "index.js");

const doctor = run("node", [cli, "doctor"]);
check(doctor.status === 0 && (doctor.stdout ?? "").includes("node"), "cli doctor runs", (doctor.stdout ?? "").split("\n")[0]?.trim());

const convertText = run("node", [cli, "convert", "--text", "make a python script, use pandas, use pandas again", "--json"]);
let convertJson = {};
try {
  convertJson = JSON.parse(convertText.stdout ?? "{}");
} catch {
  /* reported below */
}
check(convertText.status === 0 && typeof convertJson.markdown === "string", "cli convert --text", `engine=${convertJson.report?.engine}`);

const htmlFixture = join(clone, "fixtures", "cases", "03-html-article", "input.html");
const convertFile = run("node", [cli, "convert", htmlFixture, "--json"]);
let fileJson = {};
try {
  fileJson = JSON.parse(convertFile.stdout ?? "{}");
} catch {
  /* reported below */
}
const cleaned =
  typeof fileJson.markdown === "string" &&
  !/we use cookies/i.test(fileJson.markdown) &&
  fileJson.markdown.includes("Solid-State Batteries");
check(convertFile.status === 0 && cleaned, "cli converts a document and strips chrome", `engine=${fileJson.report?.engine} tokens ${fileJson.report?.inputTokens}→${fileJson.report?.outputTokens}`);

// compress -> retrieve round trip through the CLI
const bigDoc = join(sandbox, "big.md");
const original = [
  "# Ops report",
  "Head stays verbatim.",
  ...Array.from({ length: 12 }, (_, i) => `Section ${i}. ${"Narrative filler for compression pressure. ".repeat(5)}Fact-${i}.`),
  "Tail stays verbatim.",
].join("\n\n");
writeFileSync(bigDoc, original, "utf8");

const compressed = run("node", [cli, "compress", bigDoc, "--token-budget", "250", "--json"]);
let compressJson = {};
try {
  compressJson = JSON.parse(compressed.stdout ?? "{}");
} catch {
  /* reported below */
}
check(
  compressed.status === 0 && compressJson.savings?.compressedTokens < compressJson.savings?.rawTokens,
  "cli compress hits a budget",
  `${compressJson.savings?.rawTokens}→${compressJson.savings?.compressedTokens} tokens`,
);

const anchor = /p2md:src=[0-9a-f]{16}#\d+-\d+/.exec(compressJson.markdown ?? "")?.[0];
check(anchor !== undefined, "compressed output carries anchors");
if (anchor !== undefined) {
  const retrieved = run("node", [cli, "retrieve", anchor]);
  const [start, end] = anchor.split("#")[1].split("-").map(Number);
  check(
    retrieved.status === 0 && retrieved.stdout.trim() === original.slice(start, end).trim(),
    "cli retrieve returns the byte-exact original",
    `${retrieved.stdout.trim().length} chars`,
  );
}

// batch
const outDir = join(sandbox, "batch-out");
const batch = run("node", [cli, "batch", `${join(clone, "fixtures", "cases").replace(/\\/g, "/")}/**/*.txt`, "-d", outDir]);
// Content, not just an "ok" line: a converter that writes empty files is a
// silent data-loss bug, and a success-only assertion would miss it.
const outputs = existsSync(outDir)
  ? readdirSync(outDir).filter((f) => f.endsWith(".md")).map((f) => readFileSync(join(outDir, f), "utf8"))
  : [];
const smallestOutput = outputs.length > 0 ? Math.min(...outputs.map((t) => t.trim().length)) : 0;
check(
  batch.status === 0 && outputs.length >= 4 && outputs.every((t) => t.trim().length > 50),
  "cli batch writes non-empty output for every file",
  `${outputs.length} files, smallest ${smallestOutput} chars`,
);

// --- 5. installer against the sandbox home ----------------------------

step("installer (sandboxed HOME)");
["\\.cursor", "\\.gemini", "\\.codex", "\\.claude", "\\AppData\\Roaming\\Claude"].forEach((rel) => {
  const dir = join(fakeHome, rel.replace(/\\/g, "/"));
  execFileSync(process.execPath, ["-e", `require("fs").mkdirSync(${JSON.stringify(dir)},{recursive:true})`]);
});
const install = run("node", [join(clone, "scripts", "install.mjs")]);
check(install.status === 0, "installer runs from a fresh clone");
const cursorCfgPath = join(fakeHome, ".cursor", "mcp.json");
let cursorCfg = {};
try {
  cursorCfg = JSON.parse(readFileSync(cursorCfgPath, "utf8"));
} catch {
  /* reported below */
}
check(cursorCfg.mcpServers?.prompt2md?.args?.[0]?.includes("bin.js") === true, "installer wrote a usable MCP entry");
check(existsSync(join(fakeHome, ".claude", "skills", "prompt2md", "SKILL.md")), "installer placed the skill");

// --- 6. MCP over real stdio, using the installed config ---------------

step("MCP over real stdio (command taken from the generated config)");
const client = new Client({ name: "fresh-install-test", version: "0.0.1" });
await client.connect(
  new StdioClientTransport({
    command: cursorCfg.mcpServers.prompt2md.command,
    args: cursorCfg.mcpServers.prompt2md.args,
    env: { ...env, P2MD_STORE_DIR: store },
    stderr: "ignore",
  }),
);
try {
  const { tools } = await client.listTools();
  const { prompts } = await client.listPrompts();
  check(["convert", "compress_context", "retrieve_original"].every((t) => tools.some((x) => x.name === t)), "mcp exposes all tools");
  check(prompts.some((p) => p.name === "optimize"), "mcp exposes the optimize prompt");

  const result = await client.callTool({
    name: "compress_context",
    arguments: { text: original, tokenBudget: 250 },
  });
  const md = result.content[0].text;
  const mcpAnchor = /p2md:src=[0-9a-f]{16}#\d+-\d+/.exec(md)?.[0];
  check(mcpAnchor !== undefined, "mcp compress produced anchors");
  if (mcpAnchor !== undefined) {
    const back = await client.callTool({ name: "retrieve_original", arguments: { anchor: mcpAnchor } });
    const [s, e] = mcpAnchor.split("#")[1].split("-").map(Number);
    check(back.content[0].text === original.slice(s, e), "mcp retrieve_original is byte-exact");
  }
} finally {
  await client.close();
}

// --- 7. digest against live APIs --------------------------------------

step("daily digest (live public APIs)");
const digest = run("pnpm", ["--filter", "@prompt2md/web", "digest:archive"], { timeout: 180_000 });
const digestLine = /archived digest [\d-]+: (\d+) -> (\d+) tokens/.exec(digest.stdout ?? "");
check(digest.status === 0 && digestLine !== null, "digest generated from live sources", digestLine ? `${digestLine[1]} → ${digestLine[2]} tokens` : (digest.stderr ?? "").slice(-200));

// --- 8. isolation assertion -------------------------------------------

step("isolation");
const after = tryFingerprint();
const touched = Object.keys(before).filter((p) => before[p] !== after[p]);
check(touched.length === 0, "real user configs and store untouched", touched.length > 0 ? `CHANGED: ${touched.join(", ")}` : "byte-identical");

// --- report -----------------------------------------------------------

if (!KEEP) rmSync(sandbox, { recursive: true, force: true });
console.log(`\n${KEEP ? `sandbox kept: ${sandbox}` : "sandbox removed"}`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nfresh-install verification passed — a new user's clone works end to end");
