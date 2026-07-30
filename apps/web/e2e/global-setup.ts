import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const E2E_PORT = 3123;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

const WEB_DIR = dirname(fileURLToPath(import.meta.url)).replace(/[\\/]e2e$/, "");

let server: ChildProcess | undefined;

/** Boots the production Next.js server for the suite (requires `next build` first). */
export default async function setup(): Promise<() => void> {
  const nextBin = join(WEB_DIR, "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(join(WEB_DIR, ".next"))) {
    throw new Error("no .next build found — run `pnpm --filter @prompt2md/web build` first");
  }

  server = spawn(process.execPath, [nextBin, "start", "-p", String(E2E_PORT)], {
    cwd: WEB_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production" },
  });
  let outputTail = "";
  const capture = (chunk: Buffer): void => {
    outputTail = (outputTail + chunk.toString("utf8")).slice(-1500);
  };
  server.stdout?.on("data", capture);
  server.stderr?.on("data", capture);

  const deadline = Date.now() + 90_000;
  for (;;) {
    let lastStatus = 0;
    try {
      const res = await fetch(E2E_BASE_URL);
      if (res.ok) break;
      lastStatus = res.status;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) {
      killServer();
      throw new Error(
        `web server did not become ready on :${E2E_PORT} within 90s` +
          `${lastStatus > 0 ? ` (last status ${lastStatus} — a 500 usually means .next holds a dev build; run next build first)` : ""}` +
          `${outputTail !== "" ? `\nserver output:\n${outputTail}` : ""}`,
      );
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return killServer;
}

function killServer(): void {
  if (server?.pid !== undefined) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      server.kill("SIGTERM");
    }
  }
  server = undefined;
}
