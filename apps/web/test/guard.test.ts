import { describe, expect, it } from "vitest";
import { MAX_INPUT_CHARS, checkText, readJsonBody, sanitizeMessage, withDeadline } from "../lib/guard";

/**
 * The studio is open to anyone, so these are the contracts that hold when the
 * input is not a well-behaved test fixture.
 */

function jsonRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/convert", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("input limits", () => {
  it("rejects text past the character limit with 413, not a generic 400", async () => {
    const result = checkText("x".repeat(MAX_INPUT_CHARS + 1));
    expect("error" in result && result.status).toBe(413);
    // The message has to tell someone what to do next, not just say no.
    expect("error" in result && result.error).toMatch(/limit is|Split it|CLI/);
  });

  it("accepts text exactly at the limit", () => {
    const result = checkText("x".repeat(MAX_INPUT_CHARS));
    expect("text" in result).toBe(true);
  });

  it("rejects non-string and blank text", () => {
    for (const bad of [undefined, null, 12345, {}, "   \n\t "]) {
      const result = checkText(bad);
      expect("error" in result && result.status).toBe(400);
    }
  });

  it("refuses a body larger than the cap without buffering all of it", async () => {
    const result = await readJsonBody(jsonRequest("{}", { "content-length": String(999_999_999) }), 1024);
    expect("error" in result && result.status).toBe(413);
  });

  it("counts actual bytes when content-length lies", async () => {
    const body = JSON.stringify({ text: "y".repeat(5000) });
    // No content-length header set by us — the stream counter must catch it.
    const result = await readJsonBody(jsonRequest(body), 1024);
    expect("error" in result && result.status).toBe(413);
  });

  it("returns 400 for malformed JSON rather than throwing", async () => {
    const result = await readJsonBody(jsonRequest('{"text":'));
    expect("error" in result && result.status).toBe(400);
  });
});

describe("deadlines", () => {
  it("passes through work that finishes in time", async () => {
    await expect(withDeadline(Promise.resolve("done"), "test")).resolves.toBe("done");
  });

  it("fails with an explanation instead of hanging until the platform kills it", async () => {
    const never = new Promise((resolve) => setTimeout(resolve, 30_000));
    await expect(withDeadline(never, "conversion", 40)).rejects.toThrow(
      /conversion exceeded \d+s.*CLI/s,
    );
  });

  it("clears its timer so a fast success cannot keep the process alive", async () => {
    const before = process.getActiveResourcesInfo?.().filter((r) => r === "Timeout").length ?? 0;
    await withDeadline(Promise.resolve(1), "quick", 30_000);
    const after = process.getActiveResourcesInfo?.().filter((r) => r === "Timeout").length ?? 0;
    expect(after).toBeLessThanOrEqual(before);
  });
});

describe("error sanitisation", () => {
  it("strips absolute paths from messages that reach a client", () => {
    expect(sanitizeMessage("ENOENT: no such file, open 'C:\\Users\\alice\\secret\\notes.txt'")).not.toContain(
      "alice",
    );
    expect(sanitizeMessage("failed reading /home/deploy/app/.env.local")).not.toContain("deploy");
    expect(sanitizeMessage("failed reading /Users/bob/private/x")).toContain("<path>");
  });

  it("strips host and port details", () => {
    expect(sanitizeMessage("connect ECONNREFUSED 127.0.0.1:5001")).toContain("<host>");
  });

  it("keeps genuinely useful guidance intact", () => {
    const actionable =
      'pdf input needs a document engine. Install the MarkItDown sidecar with `pip install "markitdown[all]"`.';
    expect(sanitizeMessage(actionable)).toContain("markitdown[all]");
  });

  it("caps length so an error cannot become a payload", () => {
    expect(sanitizeMessage("e".repeat(5000)).length).toBeLessThanOrEqual(400);
  });
});
