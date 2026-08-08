#!/usr/bin/env node
/**
 * Installs the /prompt2md agent skill.
 *
 *   npx prompt2md-skill              choose a location, then install
 *   npx prompt2md-skill --yes        skip the prompt, install for this machine
 *   npx prompt2md-skill --dry-run    show what would change, touch nothing
 *   npx prompt2md-skill --project    install into ./.claude/skills
 *   npx prompt2md-skill --dir <path> install into an explicit skills directory
 *   npx prompt2md-skill --force      replace an existing skill without backing it up
 *
 * Zero dependencies, idempotent, and safe to re-run. An existing skill that
 * differs from this one is backed up beside itself before being replaced,
 * never silently overwritten. Every install is read back and verified before
 * the command reports success.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
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

  npx prompt2md-skill              choose a location, then install
  npx prompt2md-skill --yes        skip the prompt, install for this machine
  npx prompt2md-skill --dry-run    show what would change, touch nothing
  npx prompt2md-skill --project    install into ./.claude/skills (this folder)
  npx prompt2md-skill --dir <path> install into an explicit skills directory
  npx prompt2md-skill --force      replace an existing skill without backing it up

After installing, start a new agent session and run /prompt2md.
`);
  process.exit(0);
}

const DRY_RUN = has("--dry-run");
const FORCE = has("--force");
const ASSUME_YES = has("--yes") || has("-y");
// P2MD_INSTALL_HOME keeps the test suite out of a real user profile.
const HOME = process.env["P2MD_INSTALL_HOME"] ?? homedir();
const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_SRC = join(PKG, "prompt2md");

if (!existsSync(join(SKILL_SRC, "SKILL.md"))) {
  console.error(`Broken package: ${join(SKILL_SRC, "SKILL.md")} is missing. Please report this at`);
  console.error("https://github.com/Hotragn/Prompt2MD/issues");
  process.exit(1);
}

/* -------------------------------------------------------------- appearance */

/**
 * Terminal colour, negotiated rather than assumed.
 *
 * Level 3 truecolor / 2 = 256 / 1 = basic 16 / 0 = none. Every colour is
 * authored once as brand RGB and degraded automatically, so the banner looks
 * intentional on a modern terminal and stays legible over SSH on a 16-colour
 * TTY. NO_COLOR and a non-TTY stdout both fall to 0: piping the installer to a
 * log file must not fill it with escape codes.
 */
const NO_COLOR = (process.env["NO_COLOR"] ?? "") !== "";
const FORCE_COLOR = (process.env["FORCE_COLOR"] ?? "0") !== "0";

const COLOR_LEVEL = (() => {
  if (NO_COLOR) return 0;
  if (FORCE_COLOR) return 3;
  if (process.stdout.isTTY !== true) return 0;
  if (process.env["TERM"] === "dumb") return 0;
  const colorterm = process.env["COLORTERM"] ?? "";
  if (colorterm === "truecolor" || colorterm === "24bit") return 3;
  // Windows Terminal does truecolor but often leaves COLORTERM unset, so it
  // would otherwise be misread as a 16-colour console.
  if ((process.env["WT_SESSION"] ?? "") !== "") return 3;
  if ((process.env["TERM"] ?? "").includes("256")) return 2;
  return 1;
})();

// ESC is built from its char code so the escape byte is explicit in source
// rather than an invisible literal an editor or copy/paste can silently eat.
const ESC = String.fromCharCode(27);
const RESET = `${ESC}[0m`;

/** Brand RGB, with a 256 index and a basic-16 code to fall back to. */
const ink = (rgb, x256, basic) => (s) => {
  if (COLOR_LEVEL >= 3) return `${ESC}[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${s}${RESET}`;
  if (COLOR_LEVEL === 2) return `${ESC}[38;5;${x256}m${s}${RESET}`;
  if (COLOR_LEVEL === 1) return `${ESC}[${basic}m${s}${RESET}`;
  return s;
};

const attr = (code) => (s) => (COLOR_LEVEL > 0 ? `${ESC}[${code}m${s}${RESET}` : s);
const bold = attr("1");
const dim = attr("2");

const violet = ink([124, 92, 255], 99, "35");
const green = ink([34, 160, 90], 71, "32");
const amber = ink([180, 83, 9], 172, "33");
const slate = ink([120, 116, 130], 245, "90");

/**
 * Whether non-ASCII glyphs are safe. A legacy Windows code page renders them
 * as mojibake, which looks far worse than the plain fallback.
 */
const UNICODE_OK = (() => {
  if (process.platform !== "win32") {
    const locale = `${process.env["LC_ALL"] ?? ""}${process.env["LC_CTYPE"] ?? ""}${process.env["LANG"] ?? ""}`;
    return /UTF-?8/i.test(locale);
  }
  return (process.env["WT_SESSION"] ?? "") !== "" || process.env["TERM_PROGRAM"] === "vscode";
})();

// One small solid triangle: a folded corner of paper. A five-line ASCII crane
// was tried twice and read as a mountain both times — at terminal resolution
// the bird cannot carry the detail, so the type carries the identity instead
// and the glyph is reduced to the fold itself.
const GLYPH = UNICODE_OK ? "◣" : ">";

// Paper-white for the name, brand violet for the accent: the same two-tone
// split as the logo, not a rainbow. Colour here identifies, it does not decorate.
const paper = ink([242, 239, 234], 255, "37");

/** Rail glyphs — a vertical spine with nodes, for step-by-step flows. */
const RAIL = UNICODE_OK ? "│" : "|";
const NODE = UNICODE_OK ? "◇" : "o";

/**
 * The wordmark at 5 cells per letter, which is the narrowest that still holds
 * an M and a D apart. An earlier 3-cell version turned "m" into two dots and
 * read as a barcode. Uppercase because lowercase needs descenders for the two
 * p's and the d, costing two more rows and reading worse at this size.
 */
const WORD_PROMPT = [
  "████  ████   ███  █   █ ████  █████",
  "█   █ █   █ █   █ ██ ██ █   █   █  ",
  "████  ████  █   █ █ █ █ ████    █  ",
  "█     █  █  █   █ █   █ █       █  ",
  "█     █   █  ███  █   █ █       █  ",
];

/**
 * The crane, standing in for the "2" — prompt-TO-md, where the 2 is the thing
 * that does the folding. Traced from the app icon: facing left, beak
 * upper-left, one dominant raised wing, low tail, tapering to a point. Half
 * blocks (▀▄) buy a second row of vertical resolution per text row, which is
 * what makes a bird possible in five rows at all. Paper-white against violet
 * letters, because that is the icon's own relationship.
 */
const CRANE = ["    ▄██▄ ", " █▄▄████▄", "  ██████▀", "   ███▀▀ ", "    ▀    "];

const WORD_MD = ["█   █ ████ ", "██ ██ █   █", "█ █ █ █   █", "█   █ █   █", "█   █ ████ "];

// Below ~60 columns the banner wraps, which looks like a rendering fault —
// worse than no banner. Fall back to the one-line lockup there.
const WIDE_ENOUGH = (process.stdout.columns ?? 0) === 0 || (process.stdout.columns ?? 0) >= 64;

/**
 * The wordmark lit top-to-bottom in one hue. BRAND.md locks the palette to a
 * single accent and retires the old two-hue gradient, so this is one colour
 * shaded for depth, not a gradient. The bottom row is the canonical --brand
 * #5B3DF5; the rows above lift it toward the light, because #5B3DF5 alone is
 * too dark to read on the dark terminal this actually runs on.
 */
const WORDMARK_SHADES = [
  [158, 137, 255],
  [140, 116, 255],
  [124, 92, 255],
  [106, 74, 249],
  [91, 61, 245],
];

function banner() {
  console.log("");
  if (UNICODE_OK && WIDE_ENOUGH) {
    for (let i = 0; i < WORD_PROMPT.length; i++) {
      const shade = WORDMARK_SHADES[i] ?? WORDMARK_SHADES[WORDMARK_SHADES.length - 1];
      const letters = ink(shade, 99, "35");
      console.log(`  ${letters(WORD_PROMPT[i])} ${paper(CRANE[i])} ${letters(WORD_MD[i])}`);
    }
    console.log("");
    console.log(`  ${violet(GLYPH)}  ${slate("A Markdown Magic")}`);
  } else {
    console.log(`  ${violet(GLYPH)}  ${bold(paper("prompt"))}${bold(violet("2md"))}`);
    console.log(`     ${slate("A Markdown Magic")}`);
  }
  console.log("");
}

/** One step on the rail: a node, its label, then indented detail under the spine. */
function step(label, detail) {
  console.log(`  ${violet(NODE)}  ${bold(label)}`);
  for (const line of detail) console.log(`  ${slate(RAIL)}  ${line}`);
  console.log(`  ${slate(RAIL)}`);
}

/* ------------------------------------------------------------ destinations */

const HOME_SKILLS = join(HOME, ".claude", "skills");
const PROJECT_SKILLS = resolve(".claude", "skills");

/**
 * Where skills live. Claude Code reads ~/.claude/skills; a project-local
 * .claude/skills applies to one repo. Other agent runtimes that adopted the
 * same layout work by pointing --dir at their own directory.
 */
function machineTargets() {
  const candidates = [
    { agent: "Claude Code", skillsDir: HOME_SKILLS, marker: join(HOME, ".claude") },
    // The shared cross-tool location: the `skills` CLI keeps skills here and
    // links them into whichever agents want them.
    //
    // Explicitly NOT ~/.codex/skills. Codex loads skills from inside plugins
    // (~/.codex/plugins/<marketplace>/<plugin>/<version>/skills/<name>/SKILL.md),
    // so a flat directory there is silently ignored — we would have created it
    // and reported "installed" for something that does nothing. Any other tool
    // is reachable with --dir pointed at its own skills directory.
    {
      agent: "Agent skills (shared)",
      skillsDir: join(HOME, ".agents", "skills"),
      marker: join(HOME, ".agents"),
    },
  ];
  const detected = candidates.filter((c) => existsSync(c.marker));
  // Nothing detected still installs for Claude Code: creating ~/.claude/skills
  // is harmless, and a first-time user should not have to install the agent
  // first just to stage a skill.
  return detected.length > 0 ? detected : [candidates[0]];
}

const INTERACTIVE =
  process.stdin.isTTY === true &&
  process.stdout.isTTY === true &&
  (process.env["CI"] ?? "") === "" &&
  !ASSUME_YES &&
  !DRY_RUN;

/**
 * Ask where the skill should go. Explicit flags always win, and anything
 * non-interactive (CI, a piped stdin, `--yes`) silently takes the machine-wide
 * default rather than hanging forever waiting on a prompt nobody can answer.
 */
async function resolveTargets() {
  const explicit = valueOf("--dir");
  if (explicit !== undefined) return [{ agent: "custom", skillsDir: resolve(explicit) }];
  if (has("--project")) return [{ agent: "Claude Code (project)", skillsDir: PROJECT_SKILLS }];
  if (!INTERACTIVE) return machineTargets();

  const detected = machineTargets()
    .map((t) => t.agent)
    .join(", ");

  console.log(`  ${bold("Where should the skill go?")}`);
  console.log("");
  console.log(`    ${violet("1")}  Everywhere on this machine   ${slate(HOME_SKILLS)}`);
  console.log(`       ${slate(`detected: ${detected}`)}`);
  console.log(`    ${violet("2")}  This folder only             ${slate(PROJECT_SKILLS)}`);
  console.log(`    ${violet("3")}  Somewhere else               ${slate("you type the path")}`);
  console.log("");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`  Choose ${dim("[1]")} `)).trim();
    if (answer === "2") return [{ agent: "Claude Code (project)", skillsDir: PROJECT_SKILLS }];
    if (answer === "3") {
      const typed = (await rl.question(`  Path to a skills directory: `)).trim();
      if (typed === "") {
        console.log(`  ${amber("No path given")} ${dim("— nothing was installed.")}`);
        process.exit(1);
      }
      return [{ agent: "custom", skillsDir: resolve(typed) }];
    }
    return machineTargets();
  } finally {
    rl.close();
  }
}

/* ---------------------------------------------------------------- installing */

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

/**
 * Read the installed skill back off disk. Reporting "installed" because a copy
 * call did not throw is a claim about the write, not about the result — a
 * half-written or permission-blocked skill would still look like success.
 */
function verifyInstall(dest) {
  const skillFile = join(dest, "SKILL.md");
  if (!existsSync(skillFile)) return { ok: false, why: "SKILL.md is missing after copy" };
  try {
    const body = readFileSync(skillFile, "utf8");
    if (body.trim() === "") return { ok: false, why: "SKILL.md is empty after copy" };
    return { ok: true, why: "" };
  } catch (err) {
    return { ok: false, why: `SKILL.md is unreadable (${err.code ?? "unknown error"})` };
  }
}

async function main() {
  banner();

  const targets = await resolveTargets();
  const results = [];
  let failed = false;

  for (const { agent, skillsDir } of targets) {
    const dest = join(skillsDir, "prompt2md");

    if (existsSync(dest) && sameTree(SKILL_SRC, dest)) {
      results.push({ agent, status: "up to date", detail: dest });
      continue;
    }

    if (DRY_RUN) {
      results.push({
        agent,
        status: existsSync(dest) ? "would replace" : "would install",
        detail: dest,
      });
      continue;
    }

    // Back up a differing existing copy rather than clobbering it — the user
    // may have edited the skill, and silently discarding that is not ours to do.
    if (existsSync(dest) && !FORCE) {
      const backup = `${dest}.bak-p2md-${Date.now()}`;
      renameSync(dest, backup);
      results.push({ agent, status: "backed up", detail: backup });
    }

    try {
      mkdirSync(skillsDir, { recursive: true });
      cpSync(SKILL_SRC, dest, { recursive: true });
    } catch (err) {
      failed = true;
      results.push({ agent, status: "failed", detail: `${dest} — ${err.message}` });
      continue;
    }

    const check = verifyInstall(dest);
    if (!check.ok) {
      failed = true;
      results.push({ agent, status: "failed", detail: `${dest} — ${check.why}` });
      continue;
    }
    results.push({ agent, status: "installed", detail: dest });
  }

  if (DRY_RUN) {
    console.log(`  ${amber("dry run")} ${dim("— nothing was modified")}`);
    console.log("");
  }

  // Status carries meaning through colour: green succeeded, amber touched
  // something of yours, red failed, dim did nothing. Never colour for variety.
  const paintStatus = (status) => {
    if (status === "installed") return green(status);
    if (status === "failed") return ink([220, 38, 38], 160, "31")(status);
    if (status === "backed up") return amber(status);
    if (status === "up to date") return dim(status);
    return violet(status);
  };

  const pad = (s, n) => String(s).padEnd(n);
  // The header states the outcome only when every location agrees on one;
  // otherwise it stays neutral and the rows carry the detail.
  const every = (s) => results.every((r) => r.status === s);
  const heading = every("installed")
    ? "Installed"
    : every("up to date")
      ? "Already up to date"
      : results.length === 1
        ? "Location"
        : "Locations";
  step(
    heading,
    // Pad before colouring: escape codes have width 0 on screen but length in
    // the string, so padEnd on an already-coloured string mis-aligns the column.
    results.map((r) => `${bold(pad(r.agent, 22))}${paintStatus(pad(r.status, 14))}${slate(r.detail)}`),
  );

  if (failed) {
    console.log(`  ${amber("The skill was not installed everywhere.")}`);
    console.log(`  ${slate("Try a writable location:")} ${violet("npx prompt2md-skill --dir <path>")}`);
    console.log("");
    process.exit(1);
  }

  step("Next", [
    `${violet("1")}  Start a new agent session, so it picks up the new skill`,
    `${violet("2")}  Run ${violet(bold("/prompt2md"))}, or just ask it to clean up a prompt`,
  ]);

  // `prompt2md` is this project's own npm package, so naming it here is safe.
  // It was deliberately omitted while the name was unclaimed: an unscoped
  // `npx prompt2md` pointing at a package we did not own would have told users
  // to execute a stranger's code.
  console.log(`  ${violet(NODE)}  ${bold("Optional — the engine")}`);
  console.log(`  ${slate(RAIL)}  ${slate("Document conversion (PDF, Office, scans) and byte-exact")}`);
  console.log(`  ${slate(RAIL)}  ${slate("retrieval need it too. See what this machine can already do:")}`);
  console.log(`  ${slate(RAIL)}  ${violet("npx prompt2md doctor")}`);
  console.log("");
  console.log(`  ${slate("https://prompt2md.vercel.app")}`);
  console.log("");
}

main().catch((err) => {
  console.error(`\n  Install failed: ${err.message}\n`);
  process.exit(1);
});
