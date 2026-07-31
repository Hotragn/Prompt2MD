import { readFile } from "node:fs/promises";
import type { ConvertOptions, Engine, EngineResult, SniffReport, SourceInput } from "../types/engine.js";
import type { LlmGateway } from "../types/gateway.js";

const BASE_RULES = `You are prompt2md's optimizer. Convert the raw input into clean, token-efficient Markdown.

Rules, in priority order:
1. PRESERVE every requirement, fact, number, name, constraint, and date. Never invent or embellish.
2. DEDUPLICATE: repeated instructions collapse to a single mention.
3. STRUCTURE: one "# " title; short "## " sections; bullets for enumerable items; tables for owner/task/due or field/value data.
4. STRIP noise: greetings, sign-offs, signatures, "Sent from my ...", quoted email history, legal footers, filler words.
5. NORMALIZE dates to ISO 8601 (YYYY-MM-DD) when unambiguous; keep the original form when not.

Output ONLY the Markdown document. No preamble, no code fences around the whole answer.`;

const EMAIL_ADDENDUM = `

The input is an email thread. Additionally:
- Extract decisions into a "## Decisions" section and tasks into an "## Action items" owner/task/due table.
- Content in quoted history ("> ...") counts only when not already restated above it.
- Surface unresolved concerns under "## Open risks".`;

const CODING_ADDENDUM = `

The input is a software/coding request. Additionally:
- Structure as: "# Task: <short name>" then "## Goal", "## Requirements" (bullets), "## Constraints" (language, runtime, versions, performance), "## Error handling", and "## Acceptance criteria" when inferable.
- Keep identifiers, versions, error messages, file paths, and commands verbatim in backticks.
- Surface implicit requirements the author scattered as afterthoughts; never invent new ones.
- End with an "## Approach" section containing exactly this implementation directive (ponytail discipline, github.com/DietrichGebert/ponytail):
  "Write the least code that satisfies the requirements. Decision ladder: skip it > reuse existing code > stdlib/native > well-maintained dependency > minimal custom code."`;

const CODING_HINT =
  /\b(code|coding|script|function|class|method|bug|error|exception|stack ?trace|traceback|implement|refactor|compile|debug|unit test|python|typescript|javascript|java|rust|golang|c\+\+|sql|regex|api|endpoint|cli|repo)\b/i;

/**
 * Text path: messy prompts and email threads never touch a document engine —
 * they go through the LLM gateway with deterministic settings (temperature 0).
 */
export function createPromptOptimizerEngine(gateway: LlmGateway): Engine {
  return {
    id: "prompt-optimizer",

    async convert(input: SourceInput, sniff: SniffReport, options: ConvertOptions): Promise<EngineResult> {
      const text = await materializeText(input);
      const system =
        sniff.kind === "email"
          ? BASE_RULES + EMAIL_ADDENDUM
          : sniff.kind === "prompt" && CODING_HINT.test(text)
            ? BASE_RULES + CODING_ADDENDUM
            : BASE_RULES;
      const response = await gateway.complete({
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
        temperature: 0,
        ...(options.model !== undefined ? { model: options.model } : {}),
        ...(options.tokenBudget !== undefined ? { maxTokens: Math.ceil(options.tokenBudget * 1.2) } : {}),
      });

      const markdown = response.text.trim();

      // Real providers return empty content — content filters, refusals, and
      // tool-call-only responses all do it. Handing back "" as the converted
      // document would silently erase the user's content, which is the one
      // thing this project promises never to do. Throw instead: the runtime
      // falls back to the deterministic path, which always preserves content.
      if (markdown === "") {
        throw new Error(
          `${response.model} returned empty content` +
            (response.finishReason !== undefined ? ` (finish_reason: ${response.finishReason})` : ""),
        );
      }

      // "length" means generation was cut off mid-document. A truncated
      // conversion is corrupt — the tail of the user's content is gone with
      // no marker — and must not be presented as a complete result.
      if (response.finishReason === "length") {
        throw new Error(
          `${response.model} truncated the output (finish_reason: length) — the converted ` +
            `document would be missing its tail. Raise the token budget or let the ` +
            `deterministic path handle it.`,
        );
      }

      return { markdown, warnings: [] };
    },
  };
}

async function materializeText(input: SourceInput): Promise<string> {
  switch (input.kind) {
    case "text":
      return input.text;
    case "file":
      return readFile(input.path, "utf8");
    case "buffer":
      return Buffer.from(input.data).toString("utf8");
  }
}
