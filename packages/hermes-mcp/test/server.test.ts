import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { compressContext, createFileStore, parseAnchor } from "@prompt2md/core";
import { createHermesServer } from "../src/server.js";

interface TextContent {
  readonly type: string;
  readonly text: string;
}

function contents(result: unknown): TextContent[] {
  return (result as { content: TextContent[] }).content;
}

describe("hermes MCP server (in-memory client integration)", () => {
  let client: Client;
  let original: string;

  beforeAll(async () => {
    const store = createFileStore(await mkdtemp(join(tmpdir(), "p2md-mcp-")));
    const server = createHermesServer({
      store,
      compress: (text, options) => compressContext(text, store, options),
      // convert deliberately absent: engine sidecars are not part of this test
    });
    client = new Client({ name: "test-client", version: "0.0.1" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    original = [
      "# Incident Review",
      "Intro: the outage started at 09:14 UTC and this line must survive.",
      ...Array.from({ length: 15 }, (_, i) =>
        `Detail paragraph ${i}. ${"Extended narrative about remediation steps and observations. ".repeat(4)}Critical value v-${i}.`,
      ),
      "Closing: postmortem scheduled, tail line stays verbatim.",
    ].join("\n\n");
  });

  // Pins the whole tool surface on purpose: every tool costs the client context
  // in its listing, so one must never appear here unnoticed.
  it("exposes exactly the four tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "compress_context",
      "convert",
      "outline",
      "retrieve_original",
    ]);
  });

  it("compress_context returns compressed markdown + JSON savings report", async () => {
    const result = await client.callTool({
      name: "compress_context",
      arguments: { text: original, tokenBudget: 600, provider: "anthropic" },
    });
    const [markdown, report] = contents(result);

    expect(markdown!.text).toContain("<!-- p2md:cache-breakpoint -->");
    const parsed = JSON.parse(report!.text) as {
      sourceId: string;
      savings: { rawTokens: number; compressedTokens: number; subsequentSavingsVsRawPct: number };
    };
    expect(parsed.savings.compressedTokens).toBeLessThan(parsed.savings.rawTokens);
    expect(parsed.sourceId).toMatch(/^[0-9a-f]{16}$/);
  });

  it("retrieve_original restores the verbatim span behind an anchor", async () => {
    const compressResult = await client.callTool({
      name: "compress_context",
      arguments: { text: original, tokenBudget: 600 },
    });
    const markdown = contents(compressResult)[0]!.text;
    const anchorMatch = /<!-- (p2md:src=[0-9a-f]{16}#\d+-\d+) -->/.exec(markdown);
    expect(anchorMatch).not.toBeNull();

    const retrieved = await client.callTool({
      name: "retrieve_original",
      arguments: { anchor: anchorMatch![1]! },
    });
    const verbatim = contents(retrieved)[0]!.text;

    const anchor = parseAnchor(anchorMatch![1]!)!;
    expect(verbatim).toBe(original.slice(anchor.start, anchor.end));
    expect(verbatim).toMatch(/Critical value v-\d+/);
  });

  it("retrieve_original returns the full original by sourceId", async () => {
    const compressResult = await client.callTool({
      name: "compress_context",
      arguments: { text: "tiny document", tokenBudget: 50 },
    });
    const { sourceId } = JSON.parse(contents(compressResult)[1]!.text) as { sourceId: string };

    const retrieved = await client.callTool({
      name: "retrieve_original",
      arguments: { sourceId },
    });
    expect(contents(retrieved)[0]!.text).toBe("tiny document");
  });

  it("exposes the optimize prompt for chat-box integration", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toContain("optimize");

    const result = await client.getPrompt({
      name: "optimize",
      arguments: {
        text: "please fix the bug\n\nSent from my iPhone\n\nplease fix the bug",
      },
    });
    const first = result.messages[0];
    expect(first?.role).toBe("user");
    const content = first?.content as { type: string; text: string };
    expect(content.text).not.toMatch(/sent from my iphone/i);
    expect(content.text).toContain("please fix the bug");
    // dedupe: repeated instruction collapses to one mention
    expect(content.text.match(/please fix the bug/g)).toHaveLength(1);
  });

  it("convert reports unavailable engines as a tool error, not a crash", async () => {
    const result = await client.callTool({
      name: "convert",
      arguments: { text: "hello" },
    });
    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(contents(result)[0]!.text).toMatch(/unavailable/i);
  });
});
