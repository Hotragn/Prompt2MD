#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRuntimeFromEnv } from "@prompt2md/core";
import { createHermesServer } from "./server.js";

async function main(): Promise<void> {
  const server = createHermesServer(createRuntimeFromEnv());
  await server.connect(new StdioServerTransport());
  // stderr only — stdout is the MCP transport.
  console.error("prompt2md-hermes MCP server ready (stdio)");
}

main().catch((err: unknown) => {
  console.error("fatal:", err);
  process.exit(1);
});
