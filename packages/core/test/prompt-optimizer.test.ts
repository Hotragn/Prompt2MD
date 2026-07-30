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
