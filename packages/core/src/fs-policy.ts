import { realpath, stat } from "node:fs/promises";
import { delimiter, dirname, isAbsolute, join, relative, resolve } from "node:path";

/**
 * Filesystem containment policy for untrusted callers.
 *
 * The CLI does not need this: a path a user typed at their own shell grants no
 * authority they did not already have, which is why `resolve()` there is
 * enough. The MCP server is a different trust context wearing the same
 * `SourceInput` type — the "user" is a model, and its output is untrusted. That
 * distinction is the whole reason this module exists, and it is why the guard
 * lives at the MCP boundary rather than inside the pipeline: pushing it down
 * would break the CLI's legitimate access to any file its operator can read.
 *
 * Default posture is deny. An unset P2MD_WORKSPACE_ROOTS means no file access
 * at all, not unrestricted access — a config mistake must fail closed.
 */

/** Base for every refusal this module makes, so callers can catch one type. */
export class FilePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The path is not inside an approved root, or is not a local path at all. */
export class PathOutsideWorkspaceError extends FilePolicyError {}

/**
 * The path is allowed, but the file is too big to read. Distinct from the
 * containment failure: one is "you may not", the other is "not this one" — and
 * only the second is worth telling a caller how to change.
 */
export class InputTooLargeError extends FilePolicyError {}

/**
 * A scheme of two or more characters before a colon. Deliberately not one
 * character: `C:\Users\...` is a Windows drive letter, not a URL, and rejecting
 * it would make the policy unusable on the platform this project develops on.
 *
 * This closes by policy what `sniffInput`'s `readFile` currently closes by
 * accident. MarkItDown routes `http:`/`https:`/`file:`/`data:` strings to a
 * fetcher rather than the disk, so a URL reaching the sidecar is an SSRF; today
 * it never gets there only because `readFile` throws ENOENT first. That is an
 * implementation detail of the sniffer, not a decision, and a refactor that
 * reorders or skips sniffing would silently re-open it.
 */
const URL_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]+:/;

/** `\\server\share` and `//server/share` — network locations, never workspace files. */
const UNC_PREFIX = /^[\\/]{2}/;

/**
 * Roots this process may read from, in the platform's PATH syntax
 * (`;` on Windows, `:` elsewhere — `path.delimiter`, so a Windows drive letter
 * never splits a root in half).
 *
 * Returns an empty list when unset. Callers must treat that as "deny", never
 * as "unrestricted".
 */
export function workspaceRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env["P2MD_WORKSPACE_ROOTS"];
  if (raw === undefined || raw.trim() === "") return [];
  return raw
    .split(delimiter)
    .map((root) => root.trim())
    .filter((root) => root !== "")
    .map((root) => resolve(root));
}

/**
 * Canonical path of `target`, resolving symlinks in whatever part of it exists.
 *
 * A plain `realpath` throws ENOENT for a file that is not there, which would
 * make every containment check on a missing path fail as "outside the
 * workspace" — a confusing answer to a simple typo. Resolving the nearest
 * existing ancestor and re-appending the rest keeps the symlink resolution that
 * makes this check sound, while letting a missing file report as missing.
 */
async function canonicalize(target: string): Promise<string> {
  const absolute = resolve(target);
  let existing = absolute;
  const trailing: string[] = [];

  for (;;) {
    try {
      const real = await realpath(existing);
      return trailing.length === 0 ? real : join(real, ...trailing.reverse());
    } catch {
      const parent = dirname(existing);
      // Hit the filesystem root without finding anything real: nothing to
      // resolve, so the lexical path is the best answer available.
      if (parent === existing) return absolute;
      trailing.push(existing.slice(parent.length).replace(/^[\\/]+/, ""));
      existing = parent;
    }
  }
}

/** True when `candidate` is `root` itself or lives underneath it. */
function contains(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * Prove `candidate` resolves inside one of `roots`, and return its canonical
 * path. Throws {@link PathOutsideWorkspaceError} otherwise.
 *
 * Order matters: symlinks are resolved BEFORE the containment test. A prefix
 * match against the lexical path is the classic wrong version of this check —
 * `<root>/innocent.txt` symlinked to `~/.ssh/id_rsa` passes it and reads the
 * key. The roots are canonicalized too, so a symlinked root (macOS `/tmp` is
 * `/private/tmp`) does not reject its own legitimate contents.
 *
 * Error messages never echo the resolved path. Whether a path exists, and where
 * it landed, is exactly what an unauthorized caller is probing for; the caller
 * already knows the string it sent, so repeating it adds nothing.
 */
export async function assertInWorkspace(
  candidate: string,
  roots: readonly string[],
): Promise<string> {
  if (roots.length === 0) {
    throw new PathOutsideWorkspaceError(
      "file access is disabled: set P2MD_WORKSPACE_ROOTS to the directories this server may read " +
        "(use `text` instead to convert content you already have)",
    );
  }
  if (candidate.includes("\0")) {
    throw new PathOutsideWorkspaceError("path contains a null byte");
  }
  if (URL_SCHEME.test(candidate)) {
    throw new PathOutsideWorkspaceError(
      "only local filesystem paths are accepted here, not URLs — prompt2md does not fetch remote content",
    );
  }
  if (UNC_PREFIX.test(candidate)) {
    throw new PathOutsideWorkspaceError("network (UNC) paths are not accepted");
  }

  const real = await canonicalize(candidate);
  const realRoots = await Promise.all(roots.map((root) => canonicalize(root)));

  if (!realRoots.some((root) => contains(root, real))) {
    throw new PathOutsideWorkspaceError("path is outside the approved workspace");
  }
  return real;
}

/**
 * Containment check plus a size ceiling, for callers that are about to read the
 * file. Keeping these together means a caller cannot remember one and forget
 * the other.
 *
 * `maxBytes` of 0 or less disables the size check; the containment check is
 * never optional.
 */
export async function assertReadable(
  candidate: string,
  roots: readonly string[],
  maxBytes: number,
): Promise<string> {
  const real = await assertInWorkspace(candidate, roots);
  if (maxBytes > 0) {
    const info = await stat(real).catch(() => undefined);
    if (info !== undefined && info.isFile() && info.size > maxBytes) {
      throw new InputTooLargeError(
        `file is ${Math.round(info.size / 1_000_000)}MB, over the ${Math.round(maxBytes / 1_000_000)}MB limit ` +
          `(raise P2MD_MAX_INPUT_BYTES if that is deliberate)`,
      );
    }
  }
  return real;
}
