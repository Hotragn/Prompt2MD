# @prompt2md/core

Dual-engine processing pipeline: content sniffer, engine router with
evidence-based escalation, LiteLLM gateway factory, Markdown IR, and token
reporting. See [ADR-001](../../docs/adr/ADR-001-dual-engine.md) and
[ADR-002](../../docs/adr/ADR-002-engine-selection.md).

## Usage

```ts
import {
  convertDocument,
  createDoclingEngine,
  createLiteLlmGateway,
  createMarkitdownEngine,
  createPromptOptimizerEngine,
} from "@prompt2md/core";

const gateway = createLiteLlmGateway({
  baseUrl: "http://localhost:4000/v1",   // LiteLLM proxy
  defaultModel: "claude-sonnet-5",
  fallbackModels: ["gpt-4.1"],
});

const deps = {
  engines: {
    "prompt-optimizer": createPromptOptimizerEngine(gateway),
    markitdown: createMarkitdownEngine(),                          // needs: pip install "markitdown[all]"
    docling: createDoclingEngine({ baseUrl: "http://localhost:5001" }), // docling-serve container
  },
};

const outcome = await convertDocument({ kind: "file", path: "./report.pdf" }, deps, {
  tokenBudget: 6000,
});
console.log(outcome.report);   // TokenReport: input/output tokens, ratio, per-section
console.log(outcome.markdown);
```

## Engine sidecars

| Engine | Runtime | Setup |
|---|---|---|
| markitdown | persistent Python subprocess ([python/markitdown_worker.py](python/markitdown_worker.py)) | `pip install "markitdown[all]"` |
| docling | docling-serve REST | `docker run -p 5001:5001 quay.io/docling-project/docling-serve` (use the `-cu*` image + `docling-tools models download` in production) |
| prompt-optimizer | LiteLLM proxy | `pip install litellm[proxy] && litellm --port 4000` |

## Tests

```bash
pnpm --filter @prompt2md/core test        # 44 tests: golden-corpus routing conformance + unit
pnpm --filter @prompt2md/core typecheck
```
