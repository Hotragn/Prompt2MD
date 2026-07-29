"use client";

import { useState } from "react";

type Tab = "convert" | "compress";

interface Warning {
  code: string;
  message: string;
}

interface Report {
  engine: string;
  inputTokens: number;
  outputTokens: number;
  ratio: number;
  budget?: number;
  withinBudget?: boolean;
}

interface Savings {
  rawTokens: number;
  compressedTokens: number;
  ratio: number;
  subsequentSavingsVsRawPct: number;
  cache: {
    provider: string;
    cacheEligible: boolean;
    effectiveTokensPerSubsequentCall: number;
  };
}

interface ApiResult {
  markdown?: string;
  report?: Report;
  savings?: Savings;
  sourceId?: string;
  warnings?: Warning[];
  error?: string;
}

const SAMPLE_PROMPT = `ok so what i need is basically a python script that takes a folder of csv files and merges them but ONLY the ones that have a "date" column, and also it should skip empty files. oh and the output should be a single parquet file. also please use pandas. actually it also needs to handle dates in different formats, some are MM/DD/YYYY and some are ISO. like i said merge them all into one parquet. also add logging. did i mention to skip empty files? yeah skip those. one more thing - if a file fails to parse dont crash, just log it and continue. use pandas like i said. thanks!!! also python 3.11`;

const SAMPLE_CONTEXT = [
  "# Incident 4417 — full timeline",
  ...Array.from({ length: 14 }, (_, i) =>
    `Update ${i}: engineers investigated subsystem ${i} and recorded observations. ${"Extended narrative describing dashboards, hypotheses, and dead ends in detail. ".repeat(4)}Key finding f-${i}.`,
  ),
  "Resolution: root cause was a stale feature flag; fixed at 14:02 UTC.",
].join("\n\n");

export default function Studio() {
  const [tab, setTab] = useState<Tab>("convert");
  const [text, setText] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [provider, setProvider] = useState("anthropic");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const endpoint = tab === "convert" ? "/api/convert" : "/api/compress";
      const budgetNum = budget.trim() === "" ? undefined : Number.parseInt(budget, 10);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          provider,
          ...(budgetNum !== undefined && Number.isFinite(budgetNum) ? { tokenBudget: budgetNum } : {}),
        }),
      });
      setResult((await res.json()) as ApiResult);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "request failed" });
    } finally {
      setBusy(false);
    }
  }

  const inTokens = result?.savings?.rawTokens ?? result?.report?.inputTokens;
  const outTokens = result?.savings?.compressedTokens ?? result?.report?.outputTokens;
  const pctOfInput =
    inTokens !== undefined && outTokens !== undefined && inTokens > 0
      ? Math.round((outTokens / inTokens) * 100)
      : undefined;

  return (
    <main>
      <div className="tabs" role="tablist">
        <button className="tab" data-active={tab === "convert"} onClick={() => setTab("convert")}>
          Convert
        </button>
        <button className="tab" data-active={tab === "compress"} onClick={() => setTab("compress")}>
          Compress
        </button>
      </div>

      <div className="grid">
        <section className="card">
          <h2>{tab === "convert" ? "Raw input" : "Oversized context"}</h2>
          <textarea
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              tab === "convert"
                ? "Paste a messy prompt, email thread, HTML, or CSV…"
                : "Paste the context block to compress to a token budget…"
            }
          />
          <div className="controls">
            <label>
              token budget
              <input
                type="number"
                min={1}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder={tab === "compress" ? "required" : "optional"}
              />
            </label>
            <label>
              cache profile
              <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="anthropic">anthropic</option>
                <option value="openai">openai</option>
                <option value="gemini">gemini</option>
                <option value="kimi">kimi</option>
              </select>
            </label>
            <button className="btn" onClick={() => void run()} disabled={busy || text.trim() === ""}>
              {busy ? "Working…" : tab === "convert" ? "Convert" : "Compress"}
            </button>
            <button
              className="btn ghost"
              onClick={() => setText(tab === "convert" ? SAMPLE_PROMPT : SAMPLE_CONTEXT)}
            >
              Load sample
            </button>
          </div>
          <p className="hint">
            Everything runs locally. Compression is lossless — summarized sections carry
            p2md:src anchors resolvable via retrieve.
          </p>
        </section>

        <section className="card">
          <h2>Token-optimized Markdown</h2>
          {result?.error !== undefined && <div className="error">{result.error}</div>}
          {result !== null && result.error === undefined && (
            <>
              <div className="stats">
                {inTokens !== undefined && (
                  <div className="stat">
                    <div className="k">input tokens</div>
                    <div className="v">{inTokens.toLocaleString()}</div>
                  </div>
                )}
                {outTokens !== undefined && (
                  <div className="stat">
                    <div className="k">output tokens</div>
                    <div className="v">{outTokens.toLocaleString()}</div>
                  </div>
                )}
                {pctOfInput !== undefined && (
                  <div className="stat">
                    <div className="k">size vs input</div>
                    <div className="v">{pctOfInput}%</div>
                  </div>
                )}
                {result.report?.engine !== undefined && (
                  <div className="stat">
                    <div className="k">engine</div>
                    <div className="v">{result.report.engine}</div>
                  </div>
                )}
                {result.savings !== undefined && (
                  <div className="stat">
                    <div className="k">repeat-call cost ({result.savings.cache.provider})</div>
                    <div className="v ok">
                      {result.savings.cache.effectiveTokensPerSubsequentCall.toLocaleString()} tok ·{" "}
                      {result.savings.subsequentSavingsVsRawPct}% saved
                    </div>
                  </div>
                )}
              </div>

              {inTokens !== undefined && outTokens !== undefined && inTokens > 0 && (
                <div className="meter">
                  <div className="row">
                    <span style={{ width: 46 }}>input</span>
                    <div className="bar in" style={{ width: "100%" }} />
                  </div>
                  <div className="row">
                    <span style={{ width: 46 }}>output</span>
                    <div
                      className="bar out"
                      style={{ width: `${Math.min(100, (outTokens / inTokens) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {(result.warnings ?? []).map((w, i) => (
                <div key={i} className="warning">
                  {w.code}: {w.message}
                </div>
              ))}

              {result.sourceId !== undefined && (
                <p className="hint">original stored — sourceId {result.sourceId}</p>
              )}

              <pre className="output">{result.markdown}</pre>
            </>
          )}
          {result === null && (
            <p className="hint">
              Output, token report, and savings land here. Try “Load sample” →{" "}
              {tab === "convert" ? "Convert" : "Compress"}.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
