import { describe, expect, it } from "vitest";
import { createLiteLlmGateway } from "../src/gateway/litellm.js";

interface CapturedCall {
  readonly url: string;
  readonly model: string;
}

function fakeFetch(
  responder: (call: CapturedCall, callIndex: number) => Response,
): { fetchImpl: typeof fetch; calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { model: string };
    const call: CapturedCall = { url: String(url), model: body.model };
    calls.push(call);
    return responder(call, calls.length - 1);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function okResponse(content: string, headers: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      model: "served-model",
      usage: { prompt_tokens: 100, completion_tokens: 40 },
    }),
    { status: 200, headers: { "content-type": "application/json", ...headers } },
  );
}

const REQ = { messages: [{ role: "user" as const, content: "hi" }] };

describe("LiteLLM gateway factory", () => {
  it("completes and records usage + cost header in the ledger", async () => {
    const { fetchImpl, calls } = fakeFetch(() =>
      okResponse("hello", { "x-litellm-response-cost": "0.00325" }),
    );
    const gateway = createLiteLlmGateway({
      baseUrl: "http://localhost:4000/v1/",
      defaultModel: "claude-sonnet-5",
      fetchImpl,
    });

    const res = await gateway.complete(REQ);

    expect(res.text).toBe("hello");
    expect(calls[0]?.url).toBe("http://localhost:4000/v1/chat/completions");
    expect(calls[0]?.model).toBe("claude-sonnet-5");
    const ledger = gateway.ledger();
    expect(ledger.totalPromptTokens).toBe(100);
    expect(ledger.totalCompletionTokens).toBe(40);
    expect(ledger.totalCostUsd).toBeCloseTo(0.00325);
  });

  it("retries retryable errors, then walks the fallback chain", async () => {
    const { fetchImpl, calls } = fakeFetch((call) =>
      call.model === "primary" ? new Response("boom", { status: 500 }) : okResponse("saved"),
    );
    const gateway = createLiteLlmGateway({
      baseUrl: "http://x/v1",
      defaultModel: "primary",
      fallbackModels: ["backup"],
      maxRetries: 1,
      fetchImpl,
    });

    const res = await gateway.complete(REQ);

    expect(res.text).toBe("saved");
    expect(calls.map((c) => c.model)).toEqual(["primary", "primary", "backup"]);
  });

  it("does not retry non-retryable errors on the same model", async () => {
    const { fetchImpl, calls } = fakeFetch((call) =>
      call.model === "primary" ? new Response("bad request", { status: 400 }) : okResponse("saved"),
    );
    const gateway = createLiteLlmGateway({
      baseUrl: "http://x/v1",
      defaultModel: "primary",
      fallbackModels: ["backup"],
      maxRetries: 3,
      fetchImpl,
    });

    await gateway.complete(REQ);

    expect(calls.filter((c) => c.model === "primary")).toHaveLength(1);
  });

  it("throws after every model is exhausted", async () => {
    const { fetchImpl } = fakeFetch(() => new Response("down", { status: 503 }));
    const gateway = createLiteLlmGateway({
      baseUrl: "http://x/v1",
      defaultModel: "only",
      maxRetries: 0,
      fetchImpl,
    });

    await expect(gateway.complete(REQ)).rejects.toThrow(/all models exhausted/);
  });
});
