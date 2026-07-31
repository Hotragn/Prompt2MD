import type { TokenCounter } from "../types/tokens.js";

/**
 * Deterministic prompt structuring — the zero-configuration path.
 *
 * Without an LLM gateway the optimizer could only strip filler, so a rambling
 * request came back as a shorter wall of prose. That is not what a tool called
 * prompt2md promises, and it is what every hosted user gets, since the hosted
 * deployment has no gateway.
 *
 * This reorganises a request into Goal / Requirements / Constraints using the
 * author's OWN WORDS, verbatim. It never paraphrases, never invents a title,
 * and never drops a sentence: anything it cannot classify goes under Notes.
 * Reordering is the only liberty it takes, and that is reversible in a way
 * rewriting is not.
 */

/** Sentences that state something the result must do. */
const REQUIREMENT =
  /\b(should|shall|must|needs? to|has to|have to|make sure|ensure|use |using |add |include|support|handle|skip|ignore|avoid|don'?t|do not|never|always|output|return|save|write|read|parse|log)\b/i;

/** Sentences that pin an environment rather than a behaviour. */
const CONSTRAINT =
  /\b(python|node|java|typescript|javascript|rust|go|ruby|php|dotnet|\.net)\s*v?\d|(\bversion\s+\d)|(\b\d+\.\d+(\.\d+)?\b.*\b(only|or (later|newer|above))\b)/i;

/** The sentence that says what is wanted at all. */
const GOAL = /\b(i (need|want|would like)|what i need|build|create|write|make|generate|implement|design)\b/i;

/**
 * Conversational glue that carries no requirement once the sentence is a
 * bullet. Includes bare affirmations, which survive as their own sentence when
 * filler stripping removes the question they answered ("did I mention X?
 * yeah, skip those" leaves "yeah, skip those").
 */
const LEADING_GLUE =
  /^(?:(?:and|also|oh|actually|then|plus|so|but|well|now|yeah|yes|yep|sure|ok(?:ay)?)\b[,:]?\s+)+/i;

/** A bullet already written as one — do not bullet it twice. */
const LEADING_MARKER = /^[-*+•]\s*/;

export interface StructureResult {
  readonly markdown: string;
  /** False when the input did not look like a request worth restructuring. */
  readonly structured: boolean;
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Bullet form: drop the glue, keep every remaining word exactly as written. */
function toBullet(sentence: string): string {
  let cleaned = sentence.trim();
  // Order matters: "one more thing - if a file fails" leaves a dangling marker
  // once the glue goes, and glue can also sit behind a marker.
  for (let i = 0; i < 2; i++) {
    cleaned = cleaned.replace(LEADING_MARKER, "").replace(LEADING_GLUE, "").trim();
  }
  return cleaned.replace(/\s+/g, " ").replace(/[.]+$/, "").trim();
}

export function structurePrompt(text: string, counter: TokenCounter): StructureResult {
  const all = sentences(text);

  // A one-liner does not need headings, and forcing them on would add tokens
  // for no comprehension gain.
  if (all.length < 3) return { markdown: text, structured: false };

  const goal: string[] = [];
  const requirements: string[] = [];
  const constraints: string[] = [];
  const notes: string[] = [];

  for (const [index, sentence] of all.entries()) {
    if (goal.length === 0 && (index === 0 || GOAL.test(sentence))) {
      goal.push(toBullet(sentence));
      continue;
    }
    if (CONSTRAINT.test(sentence)) {
      constraints.push(toBullet(sentence));
      continue;
    }
    if (REQUIREMENT.test(sentence)) {
      requirements.push(toBullet(sentence));
      continue;
    }
    // Never dropped — an unclassified sentence is still the author's.
    notes.push(toBullet(sentence));
  }

  // Structure only pays for itself when there is something to enumerate.
  if (requirements.length < 2) return { markdown: text, structured: false };

  const parts: string[] = [];
  if (goal.length > 0) parts.push(`## Goal\n\n${goal.join(" ")}`);
  if (requirements.length > 0) parts.push(`## Requirements\n\n${requirements.map((r) => `- ${r}`).join("\n")}`);
  if (constraints.length > 0) parts.push(`## Constraints\n\n${constraints.map((c) => `- ${c}`).join("\n")}`);
  if (notes.length > 0) parts.push(`## Notes\n\n${notes.map((n) => `- ${n}`).join("\n")}`);

  const markdown = parts.join("\n\n");

  // If reorganising somehow cost more than it clarified by a wide margin, the
  // original prose is the better answer. Headings are worth a little, not a lot.
  const before = counter.count(text);
  const after = counter.count(markdown);
  if (after > before * 1.25) return { markdown: text, structured: false };

  return { markdown, structured: true };
}
