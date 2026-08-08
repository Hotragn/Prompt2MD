# Changelog

Notable changes to prompt2md. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project will
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) from its first
tagged release.

Every performance or savings figure quoted here comes from a real run and is
reproducible from the repository.

## [Unreleased]

Nothing tagged yet. Everything below is on `main` and working, but the packages
are not published to npm — that is deliberate, and gated on the repository going
public. Until then, install by cloning (see the README).

### Added

- **Dual-engine conversion pipeline.** Cheap byte-level probes route each input
  to the fast path (MarkItDown) or the high-fidelity path (Docling), on content
  evidence rather than file extension. The fast path's output is inspected for
  damage — degraded tables, low yield — and escalates automatically.
- **Token cost as a first-class output.** Every conversion returns a
  `TokenReport`: tokens in and out, compression ratio, per-section costs, budget
  verdicts, and the effective cost of each repeat call under a provider's cache
  pricing. `--token-budget` is enforced, not suggested.
- **Lossless compression.** Originals are stored content-addressed *before* any
  transformation. Summarized sections carry `p2md:src` anchors that
  `retrieve_original` resolves to byte-exact source.
- **Four surfaces on one pipeline** — a CLI (`convert`, `batch`, `compress`,
  `retrieve`, `doctor`, plus `batch --watch`), an MCP server with an `optimize`
  chat-box prompt, a `/prompt2md` agent skill, and a web studio.
- **One-command setup** (`pnpm setup`) that detects and wires Claude Code,
  Claude Desktop, Cursor, Windsurf, Gemini CLI, and Codex CLI — backing up every
  config it touches, and idempotent on re-run.
- **Daily Digest**, a live demonstration of the pipeline against three vetted
  keyless public APIs, archived daily with its real token ledger.
- **Zero-config prompt cleanup.** With no LLM gateway configured, deterministic
  filler stripping still shrinks rambling chat-box prompts — measured 150 → 120
  tokens on a real example, with every requirement preserved.
- **A documented design system** — the story, marks, palette, and rules — in
  [docs/BRAND.md](docs/BRAND.md).
- **A product website** with a hero demo that runs the real conversion API, and
  the studio at `/studio`.

### Fixed

Three data-loss defects surfaced by testing from a fresh clone rather than the
working copy — a pattern worth keeping:

- Source spans pointed at the wrong text on CRLF checkouts (the Windows Git
  default), which broke `retrieve_original` byte-exactness. Block offsets are
  now tracked against the source string directly.
- The no-gateway text engine ignored file input and returned empty output, so
  `convert file.txt` and `batch *.txt` reported success while writing nothing.
- Batch output paths collided on basename across directories, silently
  overwriting earlier results.

Also fixed: compression could return output *larger* than its input once
cache-layout metadata was added — it now declines to grow small inputs and says
why; the CLI hung after MarkItDown conversions because the Python worker held
the event loop open; and the originals store and digest cache crashed on
serverless platforms whose `HOME` does not exist.

### Security

- No telemetry, no accounts, no uploads. Processing is local by default, and
  document content leaves the machine only if you configure an LLM gateway — and
  then only to the provider you chose.
- Vulnerabilities are reported privately via GitHub Security Advisories; see
  [SECURITY.md](SECURITY.md).

[Unreleased]: https://github.com/Hotragn/Prompt2MD/commits/main
