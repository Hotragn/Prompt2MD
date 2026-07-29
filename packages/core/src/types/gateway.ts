export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
}

export interface CompletionRequest {
  readonly messages: readonly ChatMessage[];
  /** Overrides GatewayConfig.defaultModel for this call. */
  readonly model?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

export interface CompletionUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  /** From LiteLLM's x-litellm-response-cost header when present. */
  readonly costUsd?: number;
}

export interface CompletionResponse {
  readonly text: string;
  readonly model: string;
  readonly usage: CompletionUsage;
}

export interface CostLedgerEntry extends CompletionUsage {
  readonly model: string;
  readonly at: string;
}

export interface CostLedger {
  readonly entries: readonly CostLedgerEntry[];
  readonly totalPromptTokens: number;
  readonly totalCompletionTokens: number;
  readonly totalCostUsd: number;
}

export interface GatewayConfig {
  /** LiteLLM proxy base URL, e.g. "http://localhost:4000/v1". */
  readonly baseUrl: string;
  readonly apiKey?: string;
  /** LiteLLM model string, e.g. "claude-sonnet-5", "gpt-4.1", "gemini/gemini-2.5-pro", "moonshot/kimi-k2". */
  readonly defaultModel: string;
  /** Tried in order after the requested model fails all retries. */
  readonly fallbackModels?: readonly string[];
  /** Retries per model on retryable errors (429/5xx/network). Default 2. */
  readonly maxRetries?: number;
  readonly timeoutMs?: number;
  /** Injectable for tests. */
  readonly fetchImpl?: typeof fetch;
}

export interface LlmGateway {
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  ledger(): CostLedger;
}
