import type { TokenCounter } from "../types/tokens.js";

/**
 * Deterministic cleanup for rambling chat-box prompts — the zero-config path
 * when no LLM gateway is configured. Regex-only, so it can only ever remove
 * acknowledged filler; it never rewrites or invents wording.
 */

const LEADING_FILLER = /^\s*(?:(?:ok(?:ay)?|so|well|um+|uh+|alright)[,.]?\s+)+/i;
const PURE_PLEASANTRY = /^(?:thanks|thank you|cheers|regards|pls|please)[!.]*$/i;

// "did i mention X? yeah" / "did i say X? yes" — meta-commentary that only
// restates something already said.
const META_QUESTION = /\bdid i (?:mention|say)\b[^.?!]*[?]\s*(?:yeah|yes|yep)?[,.]?\s*/gi;

const HEDGE_PHRASES =
  /\b(like i said|as i said|one more thing[:,]?|just to (?:be clear|clarify)[:,]?|to be honest|honestly|basically|oh and|you know|i mean|kind of|sort of)[,]?\s*/gi;

const REPEATED_PUNCTUATION = /([!?])\1+/g;
const TRAILING_PLEASANTRY = /\b(thanks|thank you|cheers|regards)[!.]*\s*$/i;

/** Whitespace/punctuation-insensitive key for near-duplicate sentence detection. */
function normalize(sentence: string): string {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Sentence-level cleanup within one paragraph: drops meta-commentary, hedge
 * phrases, and sentences that are near-duplicates (substring, once
 * normalized) of one already kept — the common "did I mention X? yeah X"
 * pattern.
 */
/**
 * How far back the containment scan looks.
 *
 * Exact repeats are caught at any distance by the set below; this bounds only
 * the substring test, which cannot be indexed and is therefore the term that
 * used to make this quadratic. The pattern it exists for — "did I mention X?
 * yeah, X" — restates something a sentence or two earlier, never a thousand.
 * Past the window a near-duplicate survives, which costs a few tokens and
 * never changes a word: this pass only ever deletes, so the failure direction
 * is keeping too much.
 */
const DUPLICATE_WINDOW = 200;

function cleanParagraph(paragraph: string): string {
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const kept: string[] = [];
  // Normalizing was previously redone for every kept sentence on every new
  // sentence — O(n²) work, and measurably fatal on the input this path is
  // aimed at: a pasted transcript with no blank lines is one paragraph, and
  // 4,000 sentences took 5s while 40,000 took minutes. Each sentence is now
  // normalized once and the result carried.
  const keptNormalized: string[] = [];
  const seen = new Set<string>();

  for (const raw of sentences) {
    const cleaned = raw
      .replace(META_QUESTION, "")
      .replace(HEDGE_PHRASES, "")
      .replace(REPEATED_PUNCTUATION, "$1")
      .trim();
    if (cleaned.length === 0 || PURE_PLEASANTRY.test(cleaned)) continue;

    const normalized = normalize(cleaned);
    if (normalized.length === 0) continue;
    if (seen.has(normalized)) continue;

    let isDuplicate = false;
    for (let i = Math.max(0, keptNormalized.length - DUPLICATE_WINDOW); i < keptNormalized.length; i++) {
      const existing = keptNormalized[i] ?? "";
      if (existing.includes(normalized) || normalized.includes(existing)) {
        isDuplicate = true;
        break;
      }
    }
    if (isDuplicate) continue;

    kept.push(cleaned);
    keptNormalized.push(normalized);
    seen.add(normalized);
  }

  let out = kept.join(" ");
  out = out.replace(LEADING_FILLER, "");
  out = out.replace(TRAILING_PLEASANTRY, "").trim();
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

export interface FillerStripResult {
  readonly text: string;
  readonly removedTokens: number;
}

/**
 * Strips conversational filler and redundant restatements from prompt text.
 * Paragraph boundaries (blank lines) are preserved — cleanup runs within
 * each paragraph independently — so downstream document-structure passes
 * (e.g. signoff/boilerplate stripping, which matches whole sections) keep
 * working exactly as they would on the untouched text.
 */
export function stripPromptFiller(text: string, counter: TokenCounter): FillerStripResult {
  const before = counter.count(text);

  const out = text
    .split(/\n{2,}/)
    .map(cleanParagraph)
    .filter((p) => p.length > 0)
    .join("\n\n");

  // Regex passes can only remove text, never add it — but guard anyway so a
  // pathological input can never come out larger than it went in.
  const after = counter.count(out);
  return after < before ? { text: out, removedTokens: before - after } : { text, removedTokens: 0 };
}
