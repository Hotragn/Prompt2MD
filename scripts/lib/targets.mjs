import { join } from "node:path";

/**
 * Where each supported tool keeps its MCP configuration, per platform.
 * Shared by the installer and its tests so the two can never disagree —
 * and so Linux/macOS layouts stay verifiable from a Windows machine.
 *
 * @param {{ home: string, platform?: NodeJS.Platform, appData?: string }} opts
 */
export function resolveTargets({ home, platform = process.platform, appData }) {
  const roaming = appData ?? join(home, "AppData", "Roaming");
  const claudeDesktopDir =
    platform === "win32"
      ? join(roaming, "Claude")
      : platform === "darwin"
        ? join(home, "Library", "Application Support", "Claude")
        : join(home, ".config", "Claude");

  return [
    { tool: "Claude Desktop", dir: claudeDesktopDir, config: "claude_desktop_config.json", format: "json" },
    { tool: "Cursor", dir: join(home, ".cursor"), config: "mcp.json", format: "json" },
    { tool: "Windsurf", dir: join(home, ".codeium", "windsurf"), config: "mcp_config.json", format: "json" },
    { tool: "Gemini CLI", dir: join(home, ".gemini"), config: "settings.json", format: "json" },
    { tool: "Codex CLI", dir: join(home, ".codex"), config: "config.toml", format: "toml" },
  ];
}
