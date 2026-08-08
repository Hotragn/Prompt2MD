/**
 * Terminal presentation for the CLI.
 *
 * Two hard rules, because this is a pipeable tool before it is a pretty one:
 *
 *   1. Chrome goes to stderr, never stdout. `prompt2md convert x.md > out.md`
 *      must produce Markdown and nothing else, so colour is negotiated against
 *      stderr — the stream the chrome actually lands on.
 *   2. Machine-readable phrases stay contiguous. Colour wraps a whole token
 *      (`engine=markitdown`), never splits one, so anything grepping or
 *      asserting on our output keeps working when colour is on.
 *
 * The palette and wordmark are shared with the skill installer by design, not
 * by import: packages/skill is deliberately zero-dependency and cannot reach
 * into this package. Two copies of ~40 lines is the cost of that guarantee.
 */

const NO_COLOR = (process.env["NO_COLOR"] ?? "") !== "";
const FORCE_COLOR = (process.env["FORCE_COLOR"] ?? "0") !== "0";

/** 3 truecolor / 2 = 256 / 1 = basic 16 / 0 = none. */
const COLOR_LEVEL: number = (() => {
  if (NO_COLOR) return 0;
  if (FORCE_COLOR) return 3;
  // Gated on stderr: chrome is written there, and stdout is frequently a pipe
  // even in an interactive session.
  if (process.stderr.isTTY !== true) return 0;
  if (process.env["TERM"] === "dumb") return 0;
  const colorterm = process.env["COLORTERM"] ?? "";
  if (colorterm === "truecolor" || colorterm === "24bit") return 3;
  // Windows Terminal does truecolor but often leaves COLORTERM unset.
  if ((process.env["WT_SESSION"] ?? "") !== "") return 3;
  if ((process.env["TERM"] ?? "").includes("256")) return 2;
  return 1;
})();

// Built from the char code so the escape byte is explicit in source rather than
// an invisible literal an editor or a copy/paste can silently eat.
const ESC = String.fromCharCode(27);
const RESET = `${ESC}[0m`;

type Paint = (s: string) => string;

/** Brand RGB, with a 256 index and a basic-16 code to degrade to. */
function ink(rgb: readonly [number, number, number], x256: number, basic: string): Paint {
  return (s) => {
    if (COLOR_LEVEL >= 3) return `${ESC}[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${s}${RESET}`;
    if (COLOR_LEVEL === 2) return `${ESC}[38;5;${x256}m${s}${RESET}`;
    if (COLOR_LEVEL === 1) return `${ESC}[${basic}m${s}${RESET}`;
    return s;
  };
}

const attr = (code: string): Paint => (s) => (COLOR_LEVEL > 0 ? `${ESC}[${code}m${s}${RESET}` : s);

export const bold = attr("1");
export const dim = attr("2");

export const violet = ink([124, 92, 255], 99, "35");
export const paper = ink([242, 239, 234], 255, "37");
export const green = ink([34, 160, 90], 71, "32");
export const amber = ink([180, 83, 9], 172, "33");
export const red = ink([220, 38, 38], 160, "31");
export const slate = ink([120, 116, 130], 245, "90");

/**
 * Whether non-ASCII glyphs are safe. A legacy Windows code page renders them as
 * mojibake, which looks far worse than the plain fallback.
 */
const UNICODE_OK: boolean = (() => {
  if (process.platform !== "win32") {
    const locale = `${process.env["LC_ALL"] ?? ""}${process.env["LC_CTYPE"] ?? ""}${process.env["LANG"] ?? ""}`;
    return /UTF-?8/i.test(locale);
  }
  return (process.env["WT_SESSION"] ?? "") !== "" || process.env["TERM_PROGRAM"] === "vscode";
})();

/** A folded corner of paper. At terminal resolution the crane cannot carry its
 *  detail — a five-line ASCII bird reads as a mountain — so the type carries the
 *  identity and the glyph is reduced to the fold itself. */
export const GLYPH = UNICODE_OK ? "◣" : ">";

export const OK = UNICODE_OK ? "✓" : "+";
export const BAD = UNICODE_OK ? "✗" : "x";
/** Configured-but-optional and absent: a hollow ring, not a failure mark. */
export const OPTIONAL = UNICODE_OK ? "○" : "-";

/**
 * The lockup, two-tone exactly as the website's logo splits it: paper-white
 * name, brand violet on "2md". Colour identifies here; it does not decorate.
 *
 * Deliberately not block-letter ASCII art. A 3-cell-wide glyph cannot hold a
 * lowercase "m" — it degenerates to two dots — so the wordmark rendered as a
 * barcode and had to be read twice to be recognised at all. Type at terminal
 * resolution is the terminal's own type; the identity comes from the mark, the
 * two-tone split, and the space around them.
 */
export function lockup(version?: string): string[] {
  const name = `${bold(paper("prompt"))}${bold(violet("2md"))}`;
  return [
    "",
    `  ${violet(GLYPH)}  ${name}${version !== undefined ? `  ${slate(version)}` : ""}`,
    `     ${slate("A Markdown Magic")}`,
    "",
  ];
}

/** Pad before colouring — escape codes have zero screen width but real string
 *  length, so padEnd on an already-coloured string mis-aligns the column. */
export function pad(s: string, n: number): string {
  return s.padEnd(n);
}
