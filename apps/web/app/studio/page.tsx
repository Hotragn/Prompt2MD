"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

type Tab = "convert" | "compress" | "digest";

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
  ephemeralStore?: boolean;
  warnings?: Warning[];
  error?: string;
}

interface DigestData {
  date?: string;
  markdown?: string;
  rawTokens?: number;
  digestTokens?: number;
  ratio?: number;
  sourceId?: string;
  failures?: string[];
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

const TEXT_EXTENSIONS = /\.(txt|md|markdown|html?|csv|json|log|eml)$/i;

function renderMarkdown(md: string): string {
  return DOMPurify.sanitize(String(marked.parse(md, { async: false })));
}

/** Minimal typing for the (Chromium-only) Web Speech recognition API. */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export default function Studio() {
  const [tab, setTab] = useState<Tab>("convert");
  const [text, setText] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [provider, setProvider] = useState("anthropic");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [view, setView] = useState<"raw" | "preview">("raw");
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [digestBusy, setDigestBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [speechIn, setSpeechIn] = useState(false);
  const [speechOut, setSpeechOut] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "blocked">("idle");
  const fileInput = useRef<HTMLInputElement | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const outputRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const w = window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    setSpeechIn(typeof w.webkitSpeechRecognition === "function");
    setSpeechOut("speechSynthesis" in window);
  }, []);

  /** The whole point is pasting the result into a chat box — make that one click. */
  async function copyOutput(markdown: string) {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState("ok");
    } catch {
      // Clipboard can be refused (unfocused document, denied permission,
      // insecure origin). Never claim a copy that did not happen — select the
      // text instead so the keyboard fallback is one keystroke away.
      const pre = outputRef.current;
      if (pre !== null) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setCopyState("blocked");
    }
    setTimeout(() => setCopyState("idle"), 2400);
  }

  const loadDigest = useCallback(async (refresh: boolean) => {
    setDigestBusy(true);
    try {
      const res = await fetch(`/api/digest${refresh ? "?refresh=1" : ""}`);
      setDigest((await res.json()) as DigestData);
    } catch {
      setDigest({ error: "Could not reach the digest API — is the dev server running?" });
    } finally {
      setDigestBusy(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "digest" && digest === null && !digestBusy) void loadDigest(false);
  }, [tab, digest, digestBusy, loadDigest]);

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
      let data: ApiResult;
      try {
        data = (await res.json()) as ApiResult;
      } catch {
        data = { error: `server responded ${res.status} without a readable body` };
      }
      setResult(data);
    } catch {
      setResult({
        error:
          "Could not reach the studio API. Is the dev server running? Start it with: pnpm --filter @prompt2md/web dev",
      });
    } finally {
      setBusy(false);
    }
  }

  async function readFiles(files: FileList | null) {
    const file = files?.[0];
    if (file === undefined) return;
    if (TEXT_EXTENSIONS.test(file.name) || file.type.startsWith("text/")) {
      setText(await file.text());
      setResult(null);
      return;
    }
    // Binary formats (PDF, Office, ...) convert server-side through the engines.
    await convertBinary(file);
  }

  async function convertBinary(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("provider", provider);
      const budgetNum = budget.trim() === "" ? undefined : Number.parseInt(budget, 10);
      if (budgetNum !== undefined && Number.isFinite(budgetNum)) form.set("tokenBudget", String(budgetNum));
      const res = await fetch("/api/convert", { method: "POST", body: form });
      let data: ApiResult;
      try {
        data = (await res.json()) as ApiResult;
      } catch {
        data = { error: `server responded ${res.status} without a readable body` };
      }
      setResult(data);
      setText(`(uploaded ${file.name} — converted server-side)`);
    } catch {
      setResult({ error: "Could not reach the studio API. Is the dev server running?" });
    } finally {
      setBusy(false);
    }
  }

  function onDrop(event: DragEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    setDragging(false);
    void readFiles(event.dataTransfer.files);
  }

  function toggleDictation() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const w = window as unknown as { webkitSpeechRecognition: new () => SpeechRecognitionLike };
    const rec = new w.webkitSpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (event) => {
      const chunks: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i]!;
        if (r.isFinal) chunks.push(r[0]!.transcript);
      }
      if (chunks.length > 0) setText((prev) => `${prev}${prev.endsWith(" ") || prev === "" ? "" : " "}${chunks.join(" ").trim()}`);
    };
    rec.onend = () => setListening(false);
    recognition.current = rec;
    setListening(true);
    rec.start();
  }

  function toggleReadback(markdown: string) {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const plain = markdown.replace(/<!--[\s\S]*?-->/g, "").replace(/[#*_`>|[\]()-]/g, " ").replace(/\s+/g, " ").slice(0, 1500);
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  const inTokens = result?.savings?.rawTokens ?? result?.report?.inputTokens;
  const outTokens = result?.savings?.compressedTokens ?? result?.report?.outputTokens;
  const pctOfInput =
    inTokens !== undefined && outTokens !== undefined && inTokens > 0
      ? Math.round((outTokens / inTokens) * 100)
      : undefined;

  return (
    <div className="shell studio-shell">
      <div className="tabs" role="tablist">
        <button className="tab" data-active={tab === "convert"} onClick={() => setTab("convert")}>
          Convert
        </button>
        <button className="tab" data-active={tab === "compress"} onClick={() => setTab("compress")}>
          Compress
        </button>
        <button className="tab" data-active={tab === "digest"} onClick={() => setTab("digest")}>
          Daily Digest
        </button>
      </div>

      {tab !== "digest" && (
        <div className="grid">
          <section className="card">
            <h2>{tab === "convert" ? "Raw input" : "Oversized context"}</h2>
            <textarea
              className="input"
              data-dragging={dragging}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !busy && text.trim() !== "") {
                  e.preventDefault();
                  void run();
                }
              }}
              placeholder={
                tab === "convert"
                  ? "Paste a messy prompt, email thread, HTML, or CSV — or drop a text file here…"
                  : "Paste the context block to compress to a token budget — or drop a text file here…"
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
              <button
                className="btn"
                onClick={() => void run()}
                disabled={busy || text.trim() === ""}
                title="Ctrl/⌘ + Enter"
              >
                {busy ? "Working…" : tab === "convert" ? "Convert" : "Compress"}
              </button>
              <button
                className="btn ghost"
                onClick={() => setText(tab === "convert" ? SAMPLE_PROMPT : SAMPLE_CONTEXT)}
              >
                Load sample
              </button>
              <button className="btn ghost" onClick={() => fileInput.current?.click()}>
                Upload file
              </button>
              {speechIn && (
                <button className="btn ghost" data-live={listening} onClick={toggleDictation}>
                  {listening ? "◼ Stop dictating" : "🎙 Dictate"}
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept=".txt,.md,.markdown,.html,.htm,.csv,.json,.log,.eml,.pdf,.docx,.xlsx,.pptx,text/*"
                hidden
                onChange={(e) => void readFiles(e.target.files)}
              />
            </div>
            <p className="hint">
              Everything runs locally. Compression is lossless — summarized sections carry p2md:src
              anchors resolvable via retrieve. Text files load into the editor; PDF/Office uploads
              convert server-side through the engines.
            </p>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Token-optimized Markdown</h2>
              {result?.markdown !== undefined && (
                <div className="view-toggle">
                  <button
                    className="chip"
                    data-done={copyState === "ok"}
                    title="Copy the Markdown, ready to paste into any chat box"
                    onClick={() => void copyOutput(result.markdown ?? "")}
                  >
                    {copyState === "ok" ? "✓ Copied" : copyState === "blocked" ? "Selected — press Ctrl+C" : "Copy"}
                  </button>
                  <button className="chip" data-active={view === "raw"} onClick={() => setView("raw")}>
                    Raw
                  </button>
                  <button className="chip" data-active={view === "preview"} onClick={() => setView("preview")}>
                    Preview
                  </button>
                  {speechOut && (
                    <button className="chip" onClick={() => toggleReadback(result.markdown ?? "")}>
                      {speaking ? "◼ Stop" : "🔊 Read"}
                    </button>
                  )}
                </div>
              )}
            </div>
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
                    <div className="stat" data-hero="true">
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
                  <p className="hint">
                    original stored — sourceId {result.sourceId}
                    {result.ephemeralStore === true && (
                      <>
                        {" · "}
                        <strong>this deployment stores originals temporarily</strong>, so retrieval
                        works for now but not after the server restarts. Run it locally for
                        retrieval you can rely on.
                      </>
                    )}
                  </p>
                )}

                {view === "raw" ? (
                  <pre className="output" ref={outputRef}>
                    {result.markdown}
                  </pre>
                ) : (
                  <div
                    className="output prose"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(result.markdown ?? "") }}
                  />
                )}
              </>
            )}
            {result === null && (
              <div className="empty">
                <p className="lead">
                  {tab === "convert"
                    ? "Folding makes text smaller without removing anything from it."
                    : "Fit an oversized context to a budget — and keep every word you cut."}
                </p>
                <p className="sub">
                  {tab === "convert"
                    ? "Paste a rambling prompt and convert it. You get clean Markdown, an honest token count, and a copy button — nothing is summarized away."
                    : "Every summarized section carries a p2md:src anchor. Retrieve returns the byte-exact original, so compression is never a one-way door."}
                </p>
                <p className="sub">
                  Try <strong>Load sample</strong>, then <strong>{tab === "convert" ? "Convert" : "Compress"}</strong>{" "}
                  — or press <span className="kbd">Ctrl</span> <span className="kbd">↵</span> in the editor.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "digest" && (
        <section className="card digest">
          <div className="card-head">
            <h2>Daily Digest{digest?.date !== undefined ? ` — ${digest.date}` : ""}</h2>
            <div className="view-toggle">
              <button className="chip" onClick={() => void loadDigest(true)} disabled={digestBusy}>
                {digestBusy ? "Refreshing…" : "↻ Refresh"}
              </button>
              {speechOut && digest?.markdown !== undefined && (
                <button className="chip" onClick={() => toggleReadback(digest.markdown ?? "")}>
                  {speaking ? "◼ Stop" : "🔊 Read"}
                </button>
              )}
            </div>
          </div>
          {digestBusy && digest === null && <p className="hint">Fetching today’s sources…</p>}
          {digest?.error !== undefined && <div className="error">{digest.error}</div>}
          {digest !== null && digest.error === undefined && digest.markdown !== undefined && (
            <>
              <div className="stats">
                <div className="stat">
                  <div className="k">raw source payloads</div>
                  <div className="v">{digest.rawTokens?.toLocaleString()} tok</div>
                </div>
                <div className="stat">
                  <div className="k">this digest</div>
                  <div className="v ok">{digest.digestTokens?.toLocaleString()} tok</div>
                </div>
                {digest.ratio !== undefined && (
                  <div className="stat">
                    <div className="k">size vs raw</div>
                    <div className="v">{Math.round(digest.ratio * 100)}%</div>
                  </div>
                )}
              </div>
              {(digest.failures ?? []).map((f, i) => (
                <div key={i} className="warning">
                  source unavailable: {f}
                </div>
              ))}
              {digest.sourceId !== undefined && (
                <p className="hint">raw payloads stored losslessly — sourceId {digest.sourceId}</p>
              )}
              <div
                className="output prose digest-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(digest.markdown) }}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
