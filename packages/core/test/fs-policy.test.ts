import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  assertInWorkspace,
  assertReadable,
  workspaceRoots,
  InputTooLargeError,
  PathOutsideWorkspaceError,
} from "../src/fs-policy.js";

/**
 * The filesystem boundary for untrusted callers (the MCP server).
 *
 * Every refusal here is a file an agent could otherwise have read. The symlink
 * case is the one that matters most: a lexical prefix match — the obvious
 * implementation — passes it and hands over the target.
 */

let root: string;
let outside: string;
let canary: string;

beforeAll(async () => {
  const base = await mkdtemp(join(tmpdir(), "p2md-fsp-"));
  root = join(base, "workspace");
  outside = join(base, "secrets");
  await mkdir(root, { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(join(root, "ok.md"), "# in the workspace");
  canary = join(outside, "id_rsa");
  await writeFile(canary, "CANARY-PRIVATE-KEY");
});

describe("workspaceRoots", () => {
  it("is empty when unset — deny, never allow-all", () => {
    expect(workspaceRoots({})).toEqual([]);
    expect(workspaceRoots({ P2MD_WORKSPACE_ROOTS: "   " })).toEqual([]);
  });

  it("splits on the platform delimiter so a Windows drive letter survives", () => {
    const raw = [root, outside].join(process.platform === "win32" ? ";" : ":");
    expect(workspaceRoots({ P2MD_WORKSPACE_ROOTS: raw })).toEqual([root, outside]);
  });
});

describe("assertInWorkspace", () => {
  it("allows a file inside a root", async () => {
    await expect(assertInWorkspace(join(root, "ok.md"), [root])).resolves.toContain("ok.md");
  });

  it("allows a not-yet-existing file inside a root", async () => {
    // Output paths are legitimately absent; a missing file must read as missing,
    // not as an escape attempt.
    await expect(assertInWorkspace(join(root, "new.md"), [root])).resolves.toContain("new.md");
  });

  it("denies everything when no roots are configured", async () => {
    await expect(assertInWorkspace(join(root, "ok.md"), [])).rejects.toThrow(/P2MD_WORKSPACE_ROOTS/);
  });

  it.each([
    ["relative traversal", () => join(root, "..", "secrets", "id_rsa")],
    ["absolute path outside", () => canary],
    ["backslash traversal", () => `${root}\\..\\secrets\\id_rsa`],
    ["UNC path", () => "\\\\server\\share\\id_rsa"],
    ["forward-slash UNC", () => "//server/share/id_rsa"],
    ["http URL", () => "http://169.254.169.254/latest/meta-data/"],
    ["https URL", () => "https://example.com/x"],
    ["file URL", () => "file:///etc/passwd"],
    ["data URL", () => "data:text/plain;base64,QUJD"],
    ["null byte", () => `${join(root, "ok.md")}\0.png`],
  ])("refuses %s", async (_label, make) => {
    await expect(assertInWorkspace(make(), [root])).rejects.toBeInstanceOf(PathOutsideWorkspaceError);
  });

  // The case a startsWith() containment check gets wrong.
  it("refuses a symlink inside a root that points outside it", async () => {
    const link = join(root, "innocent.txt");
    try {
      await symlink(canary, link);
    } catch {
      return; // unprivileged Windows runner: symlinks unavailable, nothing to assert
    }
    await expect(assertInWorkspace(link, [root])).rejects.toBeInstanceOf(PathOutsideWorkspaceError);
  });

  it("accepts a root that is itself a symlink", async () => {
    // Roots are canonicalized too. Without that, naming a symlinked root
    // (macOS /tmp -> /private/tmp is the everyday case) would reject every file
    // inside it, because the canonical file path would not sit under the
    // non-canonical root string.
    const linkedRoot = join(await mkdtemp(join(tmpdir(), "p2md-fsp-link-")), "root-link");
    try {
      await symlink(root, linkedRoot, "dir");
    } catch {
      return; // unprivileged Windows runner
    }
    await expect(assertInWorkspace(join(root, "ok.md"), [linkedRoot])).resolves.toBeTruthy();
    await expect(assertInWorkspace(join(linkedRoot, "ok.md"), [root])).resolves.toBeTruthy();
  });

  it("never echoes the resolved path or reveals existence", async () => {
    const err = await assertInWorkspace(canary, [root]).catch((e: unknown) => e as Error);
    expect(err.message).not.toContain("id_rsa");
    expect(err.message).not.toContain(outside);
    expect(err.message).toBe("path is outside the approved workspace");
  });

  it("gives the same refusal for existing and non-existing paths outside", async () => {
    const real = await assertInWorkspace(canary, [root]).catch((e: Error) => e.message);
    const fake = await assertInWorkspace(join(outside, "nope"), [root]).catch((e: Error) => e.message);
    expect(real).toBe(fake);
  });
});

describe("assertReadable", () => {
  it("refuses a file over the byte ceiling, distinguishably", async () => {
    const big = join(root, "big.bin");
    await writeFile(big, Buffer.alloc(4096));
    // A distinct type from the containment failure: "not this one, and here is
    // the knob" is a different answer from "you may not read here".
    await expect(assertReadable(big, [root], 1024)).rejects.toBeInstanceOf(InputTooLargeError);
    await expect(assertReadable(big, [root], 1024)).rejects.toThrow(/P2MD_MAX_INPUT_BYTES/);
  });

  it("allows a file under the ceiling", async () => {
    await expect(assertReadable(join(root, "ok.md"), [root], 1_000_000)).resolves.toBeTruthy();
  });

  it("checks containment before size — an outside path is refused either way", async () => {
    await expect(assertReadable(canary, [root], 1)).rejects.toThrow(/outside the approved workspace/);
  });
});
