import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { maxInputBytes, maxPdfPages } from "../src/limits.js";
import { sniffInput } from "../src/router/sniffer.js";

/**
 * Input ceilings. The web app has had these since it shipped; the CLI, the
 * library and the MCP server had none, which made a large file an OOM on the
 * one surface whose caller is a language model.
 */

// Delete just the keys these cases set, rather than swapping process.env
// wholesale — replacing the object affects anything else sharing this worker.
afterEach(() => {
  delete process.env["P2MD_MAX_INPUT_BYTES"];
  delete process.env["P2MD_MAX_PDF_PAGES"];
});

describe("limits are configurable and default sanely", () => {
  it("falls back when unset, zero, negative, or junk", () => {
    for (const bad of [undefined, "0", "-1", "not-a-number", ""]) {
      const env = bad === undefined ? {} : { P2MD_MAX_INPUT_BYTES: bad };
      expect(maxInputBytes(env)).toBe(100 * 1024 * 1024);
    }
    expect(maxPdfPages({})).toBe(2_000);
  });

  it("honours a valid override", () => {
    expect(maxInputBytes({ P2MD_MAX_INPUT_BYTES: "2048" })).toBe(2048);
    expect(maxPdfPages({ P2MD_MAX_PDF_PAGES: "10" })).toBe(10);
  });
});

describe("sniffInput enforces the byte ceiling", () => {
  it("refuses an oversized file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "p2md-limit-"));
    const path = join(dir, "big.txt");
    await writeFile(path, "x".repeat(4096));

    process.env["P2MD_MAX_INPUT_BYTES"] = "1024";
    await expect(sniffInput({ kind: "file", path })).rejects.toThrow(/the limit is/);
  });

  // Boundary, because ">" vs ">=" is the mistake this code could plausibly
  // make. (An earlier draft asserted heap growth to prove the file was never
  // read; that assertion was worthless — readFile returns a Buffer, which is
  // external memory and barely moves heapUsed, so it would have passed whether
  // or not the guard worked. The ordering it was trying to prove is a `stat`
  // two lines above the `readFile` in sniffInput, and is better read than
  // measured.)
  it("allows a file exactly at the ceiling and refuses one byte over", async () => {
    const dir = await mkdtemp(join(tmpdir(), "p2md-limit-"));
    const exact = join(dir, "exact.txt");
    const over = join(dir, "over.txt");
    await writeFile(exact, "x".repeat(1024));
    await writeFile(over, "x".repeat(1025));

    process.env["P2MD_MAX_INPUT_BYTES"] = "1024";
    await expect(sniffInput({ kind: "file", path: exact })).resolves.toBeTruthy();
    await expect(sniffInput({ kind: "file", path: over })).rejects.toThrow(/the limit is/);
  });

  it("allows a file under the ceiling", async () => {
    const dir = await mkdtemp(join(tmpdir(), "p2md-limit-"));
    const path = join(dir, "small.txt");
    await writeFile(path, "hello world");

    process.env["P2MD_MAX_INPUT_BYTES"] = "1024";
    await expect(sniffInput({ kind: "file", path })).resolves.toMatchObject({ kind: "prompt" });
  });

  it("still reports a missing file as missing, not as oversized", async () => {
    const dir = await mkdtemp(join(tmpdir(), "p2md-limit-"));
    // The pipeline maps this ENOENT to "file not found"; the ceiling must not
    // have swallowed the code it keys on.
    await expect(sniffInput({ kind: "file", path: join(dir, "nope.txt") })).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
