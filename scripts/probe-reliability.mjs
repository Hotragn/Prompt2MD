#!/usr/bin/env node
/**
 * Adversarial reliability probe.
 *
 * The test suite covers the happy paths and the failures we already knew
 * about. This goes looking for the ones we have NOT verified: hostile input,
 * missing sidecars, degenerate budgets, concurrency, and the promises the
 * product makes that could quietly be false in production.
 *
 *   node scripts/probe-reliability.mjs
 *
 * Reports rather than asserts: each probe prints what actually happened, so a
 * surprising-but-acceptable result is visible instead of silently passing.
 */
import { randomBytes } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { createRuntimeFromEnv } = await import(
  new URL(`file://${join(REPO, "packages/hermes-mcp/dist/index.js").replace(/\\/g, "/")}`).href
);

const results = [];
const probe = async (name, fn) => {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, status: "ok", detail, ms: Date.now() - started });
  } catch (err) {
    results.push({
      name,
      status: "THREW",
      detail: err instanceof Error ? `${err.name}: ${err.message.slice(0, 140)}` : String(err),
      ms: Date.now() - started,
    });
  }
};

const store = await mkdtemp(join(tmpdir(), "p2md-probe-"));
const rt = createRuntimeFromEnv({ ...process.env, P2MD_STORE_DIR: store });

// --- hostile and degenerate input --------------------------------------

await probe("empty string", async () => {
  const r = await rt.convert({ kind: "text", text: "" }, { fidelity: "auto" });
  return `markdown=${JSON.stringify(r.markdown)} tokens=${r.report.outputTokens}`;
});

await probe("whitespace only", async () => {
  const r = await rt.convert({ kind: "text", text: "   \n\n\t  \n " }, { fidelity: "auto" });
  return `markdown=${JSON.stringify(r.markdown.slice(0, 20))} tokens=${r.report.outputTokens}`;
});

await probe("random binary decoded as text", async () => {
  const junk = randomBytes(4096).toString("latin1");
  const r = await rt.convert({ kind: "text", text: junk }, { fidelity: "auto" });
  return `survived, out=${r.report.outputTokens} tok, warnings=${r.doc.warnings.length}`;
});

await probe("lone surrogates / invalid unicode", async () => {
  const r = await rt.convert({ kind: "text", text: "before 𐀀 \uD800 after" }, { fidelity: "auto" });
  return `out=${r.report.outputTokens} tok, kept 'after'=${r.markdown.includes("after")}`;
});

await probe("5 MB of text", async () => {
  const big = "The quick brown fox jumps over the lazy dog. ".repeat(120_000);
  const r = await rt.convert({ kind: "text", text: big }, { fidelity: "auto" });
  return `in=${r.report.inputTokens} out=${r.report.outputTokens} tok`;
});

await probe("single line, no breaks, 1 MB", async () => {
  const r = await rt.convert({ kind: "text", text: "x".repeat(1_000_000) }, { fidelity: "auto" });
  return `out=${r.report.outputTokens} tok`;
});

// --- a real PDF with no sidecar available (the Vercel condition) --------

await probe("PDF buffer with NO markitdown/docling available", async () => {
  const bare = createRuntimeFromEnv({
    ...process.env,
    P2MD_STORE_DIR: store,
    P2MD_PYTHON_BIN: "definitely-not-a-real-python-binary",
    P2MD_DOCLING_URL: "",
  });
  // Minimal but structurally valid PDF header + binary body.
  const pdf = Buffer.concat([
    Buffer.from("%PDF-1.7\n"),
    randomBytes(2048),
    Buffer.from("\n%%EOF\n"),
  ]);
  try {
    const r = await bare.convert({ kind: "buffer", data: new Uint8Array(pdf), filename: "x.pdf" }, { fidelity: "auto" });
    const mojibake = /[�]/.test(r.markdown);
    return `returned ${r.report.outputTokens} tok; mojibake=${mojibake}; warnings=[${r.doc.warnings.map((w) => w.code).join(",")}]`;
  } finally {
    await bare.dispose?.();
  }
});

// --- budgets -------------------------------------------------------------

const CTX = ["# Doc", ...Array.from({ length: 30 }, (_, i) => `Section ${i}. ${"filler ".repeat(40)}End-${i}.`)].join("\n\n");

for (const budget of [0, 1, -5, 10_000_000]) {
  await probe(`compress with tokenBudget=${budget}`, async () => {
    const r = await rt.compress(CTX, { tokenBudget: budget });
    return `raw=${r.savings.rawTokens} out=${r.savings.compressedTokens} warnings=[${r.doc.warnings.map((w) => w.code).join(",")}]`;
  });
}

// --- the losslessness promise under stress ------------------------------

await probe("every anchor in a compressed doc resolves byte-exact", async () => {
  const r = await rt.compress(CTX, { tokenBudget: 200 });
  const anchors = [...r.markdown.matchAll(/p2md:src=([0-9a-f]{16})#(\d+)-(\d+)/g)];
  if (anchors.length === 0) return "no anchors produced";
  let checked = 0;
  for (const [, id, start, end] of anchors) {
    const span = await rt.store.getSpan(id, Number(start), Number(end));
    if (span !== CTX.slice(Number(start), Number(end))) {
      throw new Error(`anchor ${id}#${start}-${end} did not round-trip`);
    }
    checked++;
  }
  return `${checked}/${anchors.length} anchors byte-exact`;
});

await probe("retrieve with a bogus sourceId", async () => {
  const got = await rt.store.get("ffffffffffffffff");
  return `returned ${got === undefined ? "undefined (clean miss)" : "SOMETHING — unexpected"}`;
});

await probe("retrieve a span beyond the original's length", async () => {
  const id = await rt.store.put("short text", "probe");
  const span = await rt.store.getSpan(id, 0, 999_999);
  return `returned ${JSON.stringify(String(span).slice(0, 30))}`;
});

// --- concurrency ---------------------------------------------------------

await probe("12 concurrent conversions through one runtime", async () => {
  const inputs = Array.from({ length: 12 }, (_, i) => `Prompt ${i}. ok so basically do thing ${i}. thanks!!!`);
  const out = await Promise.all(
    inputs.map((t) => rt.convert({ kind: "text", text: t }, { fidelity: "auto" })),
  );
  const distinct = new Set(out.map((r) => r.markdown)).size;
  return `${out.length} completed, ${distinct} distinct outputs (no cross-talk if 12)`;
});

await probe("8 concurrent compressions (store write contention)", async () => {
  const out = await Promise.all(
    Array.from({ length: 8 }, (_, i) => rt.compress(`${CTX}\n\nUnique-${i}`, { tokenBudget: 300 })),
  );
  const ids = new Set(out.map((r) => r.sourceId));
  return `${out.length} completed, ${ids.size} distinct sourceIds`;
});

// --- file input edge cases ----------------------------------------------

await probe("nonexistent file path", async () => {
  const r = await rt.convert({ kind: "file", path: join(store, "does-not-exist.txt") }, { fidelity: "auto" });
  return `returned ${r.report.outputTokens} tok (expected a clean error instead?)`;
});

await probe("zero-byte file", async () => {
  const p = join(store, "empty.txt");
  await writeFile(p, "");
  const r = await rt.convert({ kind: "file", path: p }, { fidelity: "auto" });
  return `returned ${r.report.outputTokens} tok`;
});

await rt.dispose?.();

// --- report --------------------------------------------------------------

const pad = (s, n) => String(s).padEnd(n);
console.log("");
for (const r of results) {
  const flag = r.status === "ok" ? "ok   " : "THREW";
  console.log(`${flag} ${pad(r.name, 52)} ${pad(r.ms + "ms", 8)} ${r.detail}`);
}
const threw = results.filter((r) => r.status === "THREW");
console.log(`\n${results.length} probes, ${threw.length} threw`);
