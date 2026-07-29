import type {
  CompletionRequest,
  CompletionResponse,
  CompletionUsage,
  CostLedger,
  CostLedgerEntry,
  GatewayConfig,
  LlmGateway,
} from "../types/gateway.js";

/** Non-2xx response from the proxy; status decides retryability. */
export class GatewayHttpError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`gateway HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = "GatewayHttpError";
  }
}

interface OpenAiChatResponse {
  readonly choices?: readonly { readonly message?: { readonly content?: string } }[];
  readonly model?: string;
  readonly usage?: { readonly prompt_tokens?: number; readonly completion_tokens?: number };
}

/**
 * Factory for the LiteLLM gateway. LiteLLM's proxy exposes the OpenAI
 * chat-completions dialect for every provider (Claude, OpenAI, Gemini, Kimi,
 * local), so one client covers all of them and the model string selects the
 * provider. Retries per model on 429/5xx/network, then walks the fallback
 * chain; every successful call lands in the cost ledger.
 */
export function createLiteLlmGateway(config: GatewayConfig): LlmGateway {
  const fetchImpl = config.fetchImpl ?? fetch;
  const maxRetries = config.maxRetries ?? 2;
  const timeoutMs = config.timeoutMs ?? 60_000;
  const entries: CostLedgerEntry[] = [];

  async function callOnce(model: string, req: CompletionRequest): Promise<CompletionResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(joinUrl(config.baseUrl, "chat/completions"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.apiKey !== undefined ? { authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: req.messages,
          ...(req.maxTokens !== undefined ? { max_tokens: req.maxTokens } : {}),
          ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new GatewayHttpError(res.status, await res.text().catch(() => ""));
      }
      const body = (await res.json()) as OpenAiChatResponse;
      const cost = parseCostHeader(res);
      const usage: CompletionUsage = {
        promptTokens: body.usage?.prompt_tokens ?? 0,
        completionTokens: body.usage?.completion_tokens ?? 0,
        ...(cost !== undefined ? { costUsd: cost } : {}),
      };
      entries.push({ ...usage, model, at: new Date().toISOString() });
      return { text: body.choices?.[0]?.message?.content ?? "", model: body.model ?? model, usage };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async complete(req: CompletionRequest): Promise<CompletionResponse> {
      const models = [req.model ?? config.defaultModel, ...(config.fallbackModels ?? [])];
      let lastError: unknown;
      for (const model of models) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await callOnce(model, req);
          } catch (err) {
            lastError = err;
            if (!isRetryable(err)) break; // hard failure on this model — try the next one
            if (attempt < maxRetries) await sleep(250 * 2 ** attempt);
          }
        }
      }
      throw new Error(`all models exhausted (${models.join(", ")}): ${String(lastError)}`, {
        cause: lastError,
      });
    },

    ledger(): CostLedger {
      return {
        entries: [...entries],
        totalPromptTokens: entries.reduce((n, e) => n + e.promptTokens, 0),
        totalCompletionTokens: entries.reduce((n, e) => n + e.completionTokens, 0),
        totalCostUsd: entries.reduce((n, e) => n + (e.costUsd ?? 0), 0),
      };
    },
  };
}

function isRetryable(err: unknown): boolean {
  if (err instanceof GatewayHttpError) return err.status === 429 || err.status >= 500;
  return true; // network error / timeout abort
}

function parseCostHeader(res: Response): number | undefined {
  const raw = res.headers.get("x-litellm-response-cost");
  if (raw === null) return undefined;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : undefined;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
