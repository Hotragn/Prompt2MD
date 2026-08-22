/**
 * Resource ceilings for the pipeline itself.
 *
 * The web app has had these since it shipped (`apps/web/lib/guard.ts`), because
 * a public endpoint obviously needs them. The CLI, the library and the MCP
 * server had none — which was wrong for the MCP server for exactly the same
 * reason it was wrong for the web app: the caller is not the operator. A model
 * naming a 3GB file is not making a considered choice about memory.
 *
 * The defaults are far above any honest document and far below anything that
 * takes a process out. Every one is an env override, so the operator who
 * genuinely does convert a 400MB PDF is inconvenienced once, not blocked.
 */

const int = (name: string, fallback: number, env: NodeJS.ProcessEnv): number => {
  const raw = env[name];
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Largest input the pipeline will read from disk.
 *
 * Checked with `stat` before the first `readFile`, so an oversized file is
 * refused without ever being resident. 100MB is roughly a 5,000-page text PDF.
 */
export function maxInputBytes(env: NodeJS.ProcessEnv = process.env): number {
  return int("P2MD_MAX_INPUT_BYTES", 100 * 1024 * 1024, env);
}

/**
 * Page ceiling for the in-process PDF reader.
 *
 * Bytes alone do not bound this: page count is declared in the file, and pdf.js
 * walks every page building a text-item list per page. A small file can declare
 * an enormous page count, so the loop needs its own limit. Truncation is
 * reported as a warning rather than an error — half a very long document beats
 * none of it, provided the user is told which half they got.
 */
export function maxPdfPages(env: NodeJS.ProcessEnv = process.env): number {
  return int("P2MD_MAX_PDF_PAGES", 2_000, env);
}
