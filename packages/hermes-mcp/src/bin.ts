#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRuntimeFromEnv, workspaceRoots } from "@prompt2md/core";
import { createHermesServer } from "./server.js";

async function main(): Promise<void> {
  const roots = workspaceRoots();
  const server = createHermesServer(createRuntimeFromEnv());
  await server.connect(new StdioServerTransport());

  // stderr only — stdout is the MCP transport.
  //
  // The filesystem posture is stated at startup rather than discovered from a
  // refusal mid-session. Deny-by-default is the safe setting but not the
  // obvious one, so an operator who expected `convert path:` to work should
  // find out here, with the variable to set, not from a tool error later.
  console.error("prompt2md-hermes MCP server ready (stdio)");
  console.error(
    roots.length === 0
      ? "  file access: DISABLED — set P2MD_WORKSPACE_ROOTS to allow `convert` to read files"
      : `  file access: ${roots.length} workspace root(s): ${roots.join(", ")}`,
  );
}

main().catch((err: unknown) => {
  console.error("fatal:", err);
  process.exit(1);
});
