/**
 * Release smoke check: drives the BUILT stdio server (dist/bin.js) with a real
 * MCP client over stdio — the exact transport Claude Desktop/Code/Cursor use.
 * Exercises tools list, the optimize prompt, and a lossless compress ->
 * retrieve_original round trip. Exits non-zero on any failure.
 *
 *   pnpm --filter @prompt2md/hermes-mcp build && node scripts/verify-stdio.mjs
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const storeDir = mkdtempSync(join(tmpdir(), "p2md-verify-"));

const assert = (cond, label) => {
  if (!cond) throw new Error(`FAILED: ${label}`);
  console.error(`ok  ${label}`);
};

const client = new Client({ name: "verify-stdio", version: "0.0.1" });
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [join(pkgDir, "dist", "bin.js")],
    env: { ...process.env, P2MD_STORE_DIR: storeDir },
    stderr: "ignore",
  }),
);

try {
  const { tools } = await client.listTools();
  assert(
    ["compress_context", "convert", "retrieve_original"].every((t) => tools.some((x) => x.name === t)),
    "tools exposed over real stdio",
  );

  const { prompts } = await client.listPrompts();
  assert(prompts.some((p) => p.name === "optimize"), "optimize prompt exposed (chat-box integration)");

  const original = [
    "# Verification doc",
    "Head line survives verbatim.",
    ...Array.from({ length: 12 }, (_, i) =>
      `Paragraph ${i}. ${"Filler narrative sentence for compression pressure. ".repeat(5)}Fact-${i}.`,
    ),
    "Tail line survives verbatim.",
  ].join("\n\n");

  const compressed = await client.callTool({
    name: "compress_context",
    arguments: { text: original, tokenBudget: 250 },
  });
  const markdown = compressed.content[0].text;
  const report = JSON.parse(compressed.content[1].text);
  assert(report.savings.compressedTokens < report.savings.rawTokens, "compression reduced tokens");
  assert(markdown.includes("p2md:cache-breakpoint"), "cache-aligned layout present");

  const anchor = /p2md:src=[0-9a-f]{16}#\d+-\d+/.exec(markdown)?.[0];
  assert(anchor !== undefined, "compressed sections carry p2md:src anchors");

  const retrieved = await client.callTool({ name: "retrieve_original", arguments: { anchor } });
  const [start, end] = anchor.split("#")[1].split("-").map(Number);
  assert(retrieved.content[0].text === original.slice(start, end), "retrieve_original is byte-exact");

  console.log(
    JSON.stringify(
      {
        verified: "stdio",
        tools: tools.map((t) => t.name),
        prompts: prompts.map((p) => p.name),
        rawTokens: report.savings.rawTokens,
        compressedTokens: report.savings.compressedTokens,
        anchorRoundTrip: "byte-exact",
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
