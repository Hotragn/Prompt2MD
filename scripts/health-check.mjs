#!/usr/bin/env node
/**
 * Live-product health check. Probes the real deployments the way a user
 * arrives at them, and fails loudly on anything broken — the goal is that a
 * red scheduled run reaches the maintainer before a user files the issue.
 *
 *   node scripts/health-check.mjs
 *   P2MD_SITE_URL / P2MD_DOCS_URL override the targets.
 *
 * Run on a schedule by .github/workflows/health.yml.
 */
const SITE = (process.env.P2MD_SITE_URL ?? "https://prompt2md.vercel.app").replace(/\/+$/, "");
const DOCS = (process.env.P2MD_DOCS_URL ?? "https://prompt2md-docs.vercel.app").replace(/\/+$/, "");

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

async function probe(label, url, options, validate) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
    const ms = Date.now() - t0;
    const body = await res.text();
    const problem = validate(res, body);
    check(problem === undefined, label, problem ?? `${res.status} in ${ms}ms`);
  } catch (err) {
    check(false, label, err instanceof Error ? err.message.slice(0, 120) : String(err));
  }
}

// --- landing page: up, and actually ours --------------------------------
await probe("landing page", SITE, {}, (res, body) => {
  if (!res.ok) return `HTTP ${res.status}`;
  if (!body.includes("prompt2md")) return "response does not look like our page";
  return undefined;
});

// --- capabilities: the studio's first request ----------------------------
await probe("capabilities endpoint", `${SITE}/api/capabilities`, {}, (res, body) => {
  if (!res.ok) return `HTTP ${res.status}`;
  try {
    const caps = JSON.parse(body);
    if (typeof caps.limits?.maxInputChars !== "number") return "limits missing from payload";
  } catch {
    return "not JSON";
  }
  return undefined;
});

// --- a real conversion: the core promise, exercised end to end ----------
await probe(
  "conversion round-trip",
  `${SITE}/api/convert`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: "ok so basically i need a script that merges csv files. it should skip empty files. use pandas. output parquet. thanks!!!",
    }),
  },
  (res, body) => {
    if (!res.ok) return `HTTP ${res.status}`;
    try {
      const out = JSON.parse(body);
      if (typeof out.markdown !== "string" || out.markdown.length === 0) return "no markdown returned";
      if (!/csv|pandas|parquet/i.test(out.markdown)) return "output lost the user's content";
      if (typeof out.report?.inputTokens !== "number") return "token report missing";
      if (out.report.outputTokens > out.report.inputTokens) return "output grew past input";
    } catch {
      return "not JSON";
    }
    return undefined;
  },
);

// --- guards: the limits must actually refuse, not just exist -------------
await probe(
  "input guard refuses oversized text",
  `${SITE}/api/convert`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "x".repeat(1_200_000) }),
  },
  (res) => (res.status === 413 ? undefined : `expected 413, got ${res.status}`),
);

// --- docs site ------------------------------------------------------------
await probe("docs site", DOCS, {}, (res, body) => {
  if (!res.ok) return `HTTP ${res.status}`;
  if (!body.includes("prompt2md")) return "response does not look like our docs";
  return undefined;
});

if (failures > 0) {
  console.error(`\n${failures} probe(s) failing — the live product is degraded.`);
  process.exit(1);
}
console.log("\nlive product healthy");
