import { describe, expect, it } from "vitest";
import { createPromptOptimizerEngine } from "../src/engines/prompt-optimizer.js";
import { sniffText } from "../src/router/sniffer.js";
import type { CompletionRequest, LlmGateway } from "../src/types/gateway.js";
import { readFixture, FIXTURES_DIR } from "./helpers.js";
import { join } from "node:path";

function capturingGateway(): { gateway: LlmGateway; requests: CompletionRequest[] } {
  const requests: CompletionRequest[] = [];
  return {
    requests,
    gateway: {
      complete: (req) => {
        requests.push(req);
        return Promise.resolve({
          text: "# Task: stub",
          model: "stub",
          usage: { promptTokens: 1, completionTokens: 1 },
        });
      },
      ledger: () => ({ entries: [], totalPromptTokens: 0, totalCompletionTokens: 0, totalCostUsd: 0 }),
    },
  };
}

function systemPrompt(req: CompletionRequest | undefined): string {
  return req?.messages.find((m) => m.role === "system")?.content ?? "";
}

describe("prompt-optimizer system-prompt specialization", () => {
  it("applies the coding addendum with the ponytail decision ladder to coding requests", async () => {
    const { gateway, requests } = capturingGateway();
    const text = readFixture(join(FIXTURES_DIR, "01-messy-prompt"), "input.txt");
    await createPromptOptimizerEngine(gateway).convert({ kind: "text", text }, sniffText(text), {});

    const system = systemPrompt(requests[0]);
    expect(system).toContain("## Approach");
    expect(system).toContain("skip it > reuse existing code > stdlib/native");
    expect(system).not.toContain("email thread");
  });

  it("applies the email addendum to email threads", async () => {
    const { gateway, requests } = capturingGateway();
    const text = readFixture(join(FIXTURES_DIR, "02-meeting-email-thread"), "input.txt");
    await createPromptOptimizerEngine(gateway).convert({ kind: "text", text }, sniffText(text), {});

    const system = systemPrompt(requests[0]);
    expect(system).toContain("Decisions");
    expect(system).not.toContain("ponytail");
  });

  it("uses only the base rules for non-coding, non-email prose", async () => {
    const { gateway, requests } = capturingGateway();
    const text =
      "please summarize my meeting notes about next quarter budget planning and the offsite agenda";
    await createPromptOptimizerEngine(gateway).convert({ kind: "text", text }, sniffText(text), {});

    const system = systemPrompt(requests[0]);
    expect(system).not.toContain("ponytail");
    expect(system).not.toContain("email thread");
    expect(system).toContain("PRESERVE every requirement");
  });

  it("requests deterministic settings (temperature 0)", async () => {
    const { gateway, requests } = capturingGateway();
    await createPromptOptimizerEngine(gateway).convert(
      { kind: "text", text: "fix this bug in my python code" },
      sniffText("fix this bug in my python code"),
      {},
    );
    expect(requests[0]?.temperature).toBe(0);
  });
});

describe("prompt-optimizer refuses degenerate LLM output", () => {
  const stubGateway = (text: string, finishReason?: string): LlmGateway => ({
    complete: () =>
      Promise.resolve({
        text,
        model: "stub-model",
        usage: { promptTokens: 10, completionTokens: 0 },
        ...(finishReason !== undefined ? { finishReason } : {}),
      }),
    ledger: () => ({ entries: [], totalPromptTokens: 0, totalCompletionTokens: 0, totalCostUsd: 0 }),
  });

  const input = { kind: "text" as const, text: "please convert this rambling request into markdown" };

  it("throws on empty content instead of erasing the user's document", async () => {
    // Content filters, refusals, and tool-call-only responses all return
    // empty content in the wild. "" as the converted document would silently
    // lose everything the user pasted.
    const engine = createPromptOptimizerEngine(stubGateway("", "content_filter"));
    await expect(engine.convert(input, await sniffText(input.text), {})).rejects.toThrow(
      /empty content.*content_filter/s,
    );
  });

  it("throws on whitespace-only content the same way", async () => {
    const engine = createPromptOptimizerEngine(stubGateway("   \n\n  "));
    await expect(engine.convert(input, await sniffText(input.text), {})).rejects.toThrow(/empty content/);
  });

  it("throws on truncation instead of returning half a document", async () => {
    const engine = createPromptOptimizerEngine(stubGateway("# Doc\n\nfirst half of the conv", "length"));
    await expect(engine.convert(input, await sniffText(input.text), {})).rejects.toThrow(
      /truncated.*finish_reason: length/s,
    );
  });

  it("passes complete output through untouched", async () => {
    const engine = createPromptOptimizerEngine(stubGateway("# Task\n\nDo the thing.", "stop"));
    const result = await engine.convert(input, await sniffText(input.text), {});
    expect(result.markdown).toBe("# Task\n\nDo the thing.");
  });
});
