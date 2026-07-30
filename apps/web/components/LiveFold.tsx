"use client";

import { useEffect, useRef, useState } from "react";

const SAMPLE = `ok so what i need is basically a python script that takes a folder of csv files and merges them but ONLY the ones that have a "date" column, and also it should skip empty files. oh and the output should be a single parquet file. also please use pandas. actually it also needs to handle dates in different formats, some are MM/DD/YYYY and some are ISO. like i said merge them all into one parquet. also add logging. did i mention to skip empty files? yeah skip those. one more thing - if a file fails to parse dont crash, just log it and continue. use pandas like i said. thanks!!! also python 3.11`;

interface Report {
  inputTokens: number;
  outputTokens: number;
}

/**
 * The hero demo runs the real /api/convert endpoint against real input. It is
 * not a mockup or a canned animation: the numbers below the panel are whatever
 * the pipeline actually returned. If the request fails, it says so rather than
 * falling back to pretend output.
 */
export function LiveFold() {
  const [text, setText] = useState(SAMPLE);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const outRef = useRef<HTMLPreElement | null>(null);

  async function fold() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as {
        markdown?: string;
        report?: Report;
        error?: string;
      };
      if (data.error !== undefined || data.markdown === undefined) {
        setError(data.error ?? "conversion failed");
        return;
      }
      setMarkdown(data.markdown);
      setReport(data.report ?? null);
    } catch {
      setError("Could not reach the conversion API.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (markdown === null) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      const pre = outRef.current;
      if (pre !== null) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  const pct =
    report !== null && report.inputTokens > 0
      ? Math.round((report.outputTokens / report.inputTokens) * 100)
      : null;

  return (
    <div className="fold-demo">
      <div className="fold-panes">
        <div className="pane">
          <div className="pane-head">
            <span className="pane-title">Your prompt</span>
            <button className="link-btn" onClick={() => setText(SAMPLE)} disabled={busy}>
              reset
            </button>
          </div>
          <textarea
            className="pane-body"
            value={text}
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
            aria-label="Text to fold"
          />
        </div>

        <div className="fold-arrow" aria-hidden="true">
          <span />
        </div>

        <div className="pane">
          <div className="pane-head">
            <span className="pane-title">Token-optimized Markdown</span>
            {markdown !== null && (
              <button className="link-btn" onClick={() => void copy()}>
                {copied ? "✓ copied" : "copy"}
              </button>
            )}
          </div>
          {markdown === null ? (
            <div className="pane-body pane-idle">
              {error !== null ? (
                <span className="pane-error">{error}</span>
              ) : (
                <span>Press Fold to run this through the real pipeline.</span>
              )}
            </div>
          ) : (
            <pre className="pane-body" ref={outRef}>
              {markdown}
            </pre>
          )}
        </div>
      </div>

      <div className="fold-actions">
        <button className="btn" onClick={() => void fold()} disabled={busy || text.trim() === ""}>
          {busy ? "Folding…" : "Fold it"}
        </button>

        {report !== null && (
          <div className="ledger" role="status">
            <Metric label="before" value={report.inputTokens.toLocaleString()} />
            <span className="ledger-sep" aria-hidden="true">
              →
            </span>
            <Metric label="after" value={report.outputTokens.toLocaleString()} />
            {pct !== null && <Metric label="of original" value={`${pct}%`} tone="ok" />}
          </div>
        )}

        {report === null && !busy && (
          <span className="fold-note">Runs live against this deployment. Nothing is stored on our side.</span>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "ok" }) {
  return (
    <span className="metric">
      <span className="metric-k">{label}</span>
      <CountUp value={value} tone={tone} />
    </span>
  );
}

/** Numbers land rather than blink — the change is the point, so it is shown. */
function CountUp({ value, tone }: { value: string; tone?: "ok" }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;

    const target = Number(value.replace(/[^0-9]/g, ""));
    const suffix = value.replace(/[0-9,]/g, "");
    if (!Number.isFinite(target) || target === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const started = performance.now();
    const duration = 520;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased).toLocaleString() + suffix);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className={`metric-v${tone === "ok" ? " ok" : ""}`}>{display}</span>;
}
