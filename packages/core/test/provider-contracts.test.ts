import { describe, expect, it } from "vitest";
import { createLiteLlmGateway } from "../src/gateway/litellm.js";

/**
 * Provider contract tests.
 *
 * Every provider claim in this project rests on the OpenAI chat-completions
 * dialect that LiteLLM exposes — but real providers diverge inside that
 * dialect, and each fixture below is modeled on a shape a real deployment
 * returns. These tests pin the gateway's behaviour against each one, so a
 * contract change (ours or theirs) is caught without live keys in CI.
 *
 * The dangerous shapes are the quiet ones: `content: null` used to coerce to
 * "" and erase the user's document; a parts-array `content` crashed the
 * optimizer at `.trim()`; `finish_reason: "length"` returned half a document
 * as if it were complete.
 */

const REQ = { messages: [{ role: "user" as const, content: "convert this" }] };

function gatewayFor(payload: unknown, headers: Record<string, string> = {}) {
  return createLiteLlmGateway({
    baseUrl: "http://litellm.local/v1",
    defaultModel: "test-model",
    maxRetries: 0,
    fetchImpl: (async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json", ...headers },
      })) as typeof fetch,
  });
}

describe("provider response shapes (recorded fixtures)", () => {
  it("OpenAI: string content, snake_case usage, stop reason", async () => {
    const gw = gatewayFor({
      id: "chatcmpl-9xYz",
      object: "chat.completion",
      model: "gpt-4o-2024-08-06",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "# Task\n\nMerge the CSVs.", refusal: null },
          logprobs: null,
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 57, completion_tokens: 12, total_tokens: 69 },
      system_fingerprint: "fp_abc123",
    });

    const res = await gw.complete(REQ);
    expect(res.text).toBe("# Task\n\nMerge the CSVs.");
    expect(res.model).toBe("gpt-4o-2024-08-06");
    expect(res.usage).toMatchObject({ promptTokens: 57, completionTokens: 12 });
    expect(res.finishReason).toBe("stop");
  });

  it("Anthropic via LiteLLM: cost header lands in the ledger", async () => {
    const gw = gatewayFor(
      {
        id: "chatcmpl-claude",
        model: "claude-sonnet-5",
        choices: [{ message: { role: "assistant", content: "## Goal\n\nShip it." }, finish_reason: "stop" }],
        usage: { prompt_tokens: 210, completion_tokens: 45 },
      },
      { "x-litellm-response-cost": "0.00379" },
    );

    const res = await gw.complete(REQ);
    expect(res.text).toContain("## Goal");
    expect(res.usage.costUsd).toBeCloseTo(0.00379);
    expect(gw.ledger().totalCostUsd).toBeCloseTo(0.00379);
  });

  it("vLLM / proxy leakage: content as an array of typed parts must not crash", async () => {
    // Anthropic's native shape leaking through an "OpenAI-compatible" proxy.
    // Before normalization this reached the optimizer as an array and crashed
    // at response.text.trim().
    const gw = gatewayFor({
      model: "hosted-vllm/qwen2.5",
      choices: [
        {
          message: {
            role: "assistant",
            content: [
              { type: "text", text: "# Report\n\n" },
              { type: "text", text: "All cells preserved." },
            ],
          },
          finish_reason: "stop",
        },
      ],
    });

    const res = await gw.complete(REQ);
    expect(res.text).toBe("# Report\n\nAll cells preserved.");
  });

  it("content filter: null content surfaces as empty text with the reason attached", async () => {
    const gw = gatewayFor({
      model: "gpt-4o",
      choices: [{ message: { role: "assistant", content: null }, finish_reason: "content_filter" }],
      usage: { prompt_tokens: 33, completion_tokens: 0 },
    });

    const res = await gw.complete(REQ);
    expect(res.text).toBe("");
    expect(res.finishReason).toBe("content_filter");
  });

  it("truncation: finish_reason length is surfaced, never swallowed", async () => {
    const gw = gatewayFor({
      model: "gemini/gemini-2.5-pro",
      choices: [{ message: { role: "assistant", content: "# Doc\n\nFirst half of the conv" }, finish_reason: "length" }],
      usage: { prompt_tokens: 800, completion_tokens: 120 },
    });

    const res = await gw.complete(REQ);
    expect(res.finishReason).toBe("length");
  });

  it("Moonshot/Kimi: missing usage degrades to zeros rather than NaN", async () => {
    const gw = gatewayFor({
      model: "moonshot/kimi-k2",
      choices: [{ message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
      // no usage block at all
    });

    const res = await gw.complete(REQ);
    expect(res.usage.promptTokens).toBe(0);
    expect(res.usage.completionTokens).toBe(0);
    expect(Number.isFinite(gw.ledger().totalPromptTokens)).toBe(true);
  });

  it("OpenAI error envelope on 400: not retried, message preserved", async () => {
    let calls = 0;
    const gw = createLiteLlmGateway({
      baseUrl: "http://litellm.local/v1",
      defaultModel: "gpt-4o",
      maxRetries: 3,
      fetchImpl: (async () => {
        calls++;
        return new Response(
          JSON.stringify({
            error: {
              message: "This model's maximum context length is 128000 tokens.",
              type: "invalid_request_error",
              code: "context_length_exceeded",
            },
          }),
          { status: 400 },
        );
      }) as typeof fetch,
    });

    await expect(gw.complete(REQ)).rejects.toThrow(/context length|HTTP 400/);
    expect(calls).toBe(1); // 400 is a hard failure — retrying it is pure waste
  });

  it("rate limit: 429 with a provider error body is retried to success", async () => {
    let calls = 0;
    const gw = createLiteLlmGateway({
      baseUrl: "http://litellm.local/v1",
      defaultModel: "claude-sonnet-5",
      maxRetries: 2,
      fetchImpl: (async () => {
        calls++;
        if (calls < 3) {
          return new Response(
            JSON.stringify({ error: { message: "Rate limit exceeded", type: "rate_limit_error" } }),
            { status: 429 },
          );
        }
        return new Response(
          JSON.stringify({
            model: "claude-sonnet-5",
            choices: [{ message: { role: "assistant", content: "done" }, finish_reason: "stop" }],
            usage: { prompt_tokens: 10, completion_tokens: 2 },
          }),
          { status: 200 },
        );
      }) as typeof fetch,
    });

    const res = await gw.complete(REQ);
    expect(res.text).toBe("done");
    expect(calls).toBe(3);
  });
});
