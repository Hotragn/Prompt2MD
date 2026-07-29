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

/**
 * Text path: messy prompts and email threads never touch a document engine —
 * they go through the LLM gateway with deterministic settings (temperature 0).
 */
export function createPromptOptimizerEngine(gateway: LlmGateway): Engine {
  return {
    id: "prompt-optimizer",

    async convert(input: SourceInput, sniff: SniffReport, options: ConvertOptions): Promise<EngineResult> {
      const text = await materializeText(input);
      const system = sniff.kind === "email" ? BASE_RULES + EMAIL_ADDENDUM : BASE_RULES;
      const response = await gateway.complete({
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
        temperature: 0,
        ...(options.model !== undefined ? { model: options.model } : {}),
        ...(options.tokenBudget !== undefined ? { maxTokens: Math.ceil(options.tokenBudget * 1.2) } : {}),
      });
      return { markdown: response.text.trim(), warnings: [] };
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
