import { NextResponse } from "next/server";
import { clientKey, rateLimit, rateLimitHeaders } from "./rate-limit";

/**
 * Request guards for the public API.
 *
 * The studio is open to anyone, so input is adversarial by default: it can be
 * enormous, malformed, or crafted to make the server do expensive work. These
 * are the limits and the failure shapes, in one place so every route enforces
 * the same contract.
 */

const int = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** ~250k tokens. Generous for real documents, bounded enough to stay serviceable. */
export const MAX_INPUT_CHARS = int("P2MD_MAX_INPUT_CHARS", 1_000_000);

/** Uploads are read fully into memory before conversion, so this is a real ceiling. */
export const MAX_UPLOAD_BYTES = int("P2MD_MAX_UPLOAD_BYTES", 25 * 1024 * 1024);

/**
 * Serverless platforms kill the function at their own limit and return an
 * opaque 504. Failing first, with an explanation, is strictly better.
 */
export const REQUEST_TIMEOUT_MS = int("P2MD_REQUEST_TIMEOUT_MS", 45_000);

/**
 * Count this request against the caller's budget; return a 429 when spent.
 *
 * Call it first in a handler, before reading the body: the point is to refuse
 * work, and parsing 25MB to then reject it does the work anyway.
 */
export function enforceRateLimit(req: Request, limit: number): NextResponse | null {
  const result = rateLimit(clientKey(req), limit);
  if (result.ok) return null;
  return NextResponse.json(
    {
      error:
        `too many requests — the limit is ${result.limit} per minute. ` +
        `Retry in ${result.resetSeconds}s, or run the CLI locally where no limit applies.`,
    },
    {
      status: 429,
      headers: { ...rateLimitHeaders(result), "Retry-After": String(result.resetSeconds) },
    },
  );
}

/** Read a JSON body, refusing oversized payloads before parsing them. */
export async function readJsonBody<T>(
  req: Request,
  maxBytes = MAX_UPLOAD_BYTES,
): Promise<{ body: T } | { error: string; status: number }> {
  const declared = Number(req.headers.get("content-length") ?? Number.NaN);
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { error: `request body exceeds ${Math.floor(maxBytes / 1024 / 1024)}MB`, status: 413 };
  }

  // content-length can be absent or wrong, so count the bytes as they arrive
  // rather than trusting the header.
  const reader = req.body?.getReader();
  if (reader === undefined) return { error: "request body is required", status: 400 };

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value === undefined) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return { error: `request body exceeds ${Math.floor(maxBytes / 1024 / 1024)}MB`, status: 413 };
    }
    chunks.push(value);
  }

  try {
    return { body: JSON.parse(Buffer.concat(chunks).toString("utf8")) as T };
  } catch {
    return { error: "invalid JSON body", status: 400 };
  }
}

/** Validate free-text input shared by convert and compress. */
export function checkText(text: unknown): { text: string } | { error: string; status: number } {
  if (typeof text !== "string" || text.trim() === "") {
    return { error: "text is required", status: 400 };
  }
  if (text.length > MAX_INPUT_CHARS) {
    return {
      error:
        `input is ${text.length.toLocaleString("en-US")} characters; the limit is ` +
        `${MAX_INPUT_CHARS.toLocaleString("en-US")}. Split it, or run the CLI locally where no limit applies.`,
      status: 413,
    };
  }
  return { text };
}

/** Fail with an explanation before the platform kills the function silently. */
export async function withDeadline<T>(
  work: Promise<T>,
  label: string,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `${label} exceeded ${Math.max(1, Math.round(timeoutMs / 1000))}s. Very large or complex ` +
                  `documents are better converted with the CLI, which has no time limit.`,
              ),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Absolute paths, hostnames, and ports routinely appear in Node error messages
 * ("ENOENT ... C:\\Users\\me\\...", "ECONNREFUSED 127.0.0.1:5001"). Those are
 * useful in a server log and are nobody else's business over HTTP.
 */
export function sanitizeMessage(message: string): string {
  return message
    .replace(/[A-Za-z]:\\[^\s"']+/g, "<path>")
    .replace(/(?:\/(?:home|Users|var|tmp|opt|srv|etc)\/)[^\s"']+/g, "<path>")
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?/g, "<host>")
    .slice(0, 400);
}

/** One error shape for every route: safe for the client, detailed in the log. */
export function errorResponse(err: unknown, fallback: string): NextResponse {
  const raw = err instanceof Error ? err.message : String(err);
  // Full detail, including paths, stays server-side.
  console.error(`[prompt2md] ${fallback}:`, err);

  const timedOut = /exceeded \d+s\./.test(raw);
  return NextResponse.json(
    { error: sanitizeMessage(raw) || fallback },
    { status: timedOut ? 504 : 500 },
  );
}
