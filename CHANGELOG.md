# Changelog

Notable changes to prompt2md. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project will
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) from its first
tagged release.

Every performance or savings figure quoted here comes from a real run and is
reproducible from the repository.

## [0.2.0] — 2026-08-21

Security release. One **breaking** change to the MCP server, described first
because it will stop a working setup until one variable is set.

### Breaking

- **The MCP `convert` tool no longer reads files unless you say which ones.**
  `path` accepted any absolute path, so any model connected to the server could
  read any file the process could — SSH keys, `.env`, cloud credentials — by
  calling a document converter. It needed no sidecar: the in-process engine
  handles PDF/Office/HTML/CSV, and plain text falls through to the deterministic
  path essentially verbatim.

  File access is now **denied by default** and opt-in per directory:

  ```jsonc
  { "env": { "P2MD_WORKSPACE_ROOTS": "/home/me/projects:/home/me/docs" } }
  ```

  (`;`-separated on Windows.) Unset means `convert` refuses every `path` and
  says so; the `text` argument is unaffected. The server prints its filesystem
  posture at startup so an unconfigured deployment is obvious immediately rather
  than at the first refusal.

  Paths are canonicalized with `realpath` **before** the containment test, so a
  symlink inside an approved root that points outside it is refused — the case a
  string-prefix check waves through. URL schemes, UNC paths and null bytes are
  rejected as a matter of policy, not as a side effect of a failing `readFile`.

  The CLI is deliberately unchanged: a path typed at your own shell grants no
  authority you did not already have. The boundary exists because the MCP caller
  is a model, not the operator.

### Fixed

- **`/api/convert` was the only route not counting requests.** It imported the
  rate limiter and never called it, while `/api/capabilities` advertised a
  20/minute limit for it — so the API described a ceiling that did not exist on
  the most expensive endpoint in the app (25MB uploads, full pipeline, 45s
  deadline). The limiter now runs before the body is read, because parsing 25MB
  in order to reject it does the work anyway. A route-parity test now asserts
  every API route calls it, so the next route added cannot repeat this.
- **Input size is bounded outside the web app.** The CLI, library and MCP server
  had no ceiling — only the web app did. Files are now checked with `stat`
  before the first `readFile` (`P2MD_MAX_INPUT_BYTES`, default 100MB), at the
  single point every file path passes through. Checking after the read would be
  an OOM guard that first performs the OOM.
- **PDF page counts are capped separately.** Page count is declared inside the
  file and each page builds its own text-item list, so a small file can declare
  enough pages to hang the process; a byte ceiling cannot bound that. The
  in-process reader now stops at `P2MD_MAX_PDF_PAGES` (default 2000) and reports
  truncation as a `content-removed` warning rather than silently returning a
  partial document with a flattering token report.
- **CI no longer pipes a remote script into a shell.** The weekly scan installed
  its scanner with `curl -sSL … | bash` in a job holding an LLM API key and
  `security-events: write`, which handed whoever controls that domain, its DNS
  or its CDN a shell on the runner. The script is now downloaded, verified
  against a checksum a human vetted (`STRIX_INSTALLER_SHA256`), and only then
  run. A missing pin fails the preflight rather than passing silently.
- **`-o` no longer overwrites without asking.** `convert notes.md -o notes.md`
  read the source, converted it, and replaced the source with the result —
  unrecoverable, from a plausible typo. `batch` had guarded this since it
  shipped; the single-file path had not. An existing output now needs `--force`,
  and an output equal to the input is refused outright, `--force` included:
  there is no reading of that command which does what the author wanted.
- **The daily digest escapes the content it republishes.** Titles, summaries and
  URLs come from Hacker News, Wikipedia and Spaceflight News, and went into
  Markdown link syntax unescaped — so a title containing `](javascript:…)` would
  close the link early and rewrite where it pointed, in a document a scheduled
  job commits to `docs/digests/` and the site serves. Link targets are now
  scheme-allowlisted (`http`/`https` only, with a fallback), and remote text has
  its brackets and newlines neutralised. Newlines mattered as much as brackets:
  a title carrying `\n\n## Heading` injected a section, which no amount of
  bracket escaping would have stopped.
- **`ci.yml` runs with least privilege.** It was the only workflow without a
  `permissions:` block, so it inherited the repository default for
  `GITHUB_TOKEN` while every other workflow declared its scopes. Now
  `contents: read`, which is all it needs.

### Added

- **`pnpm pin:actions`** resolves every workflow's `uses:` tag to a commit SHA,
  keeping the tag as a trailing comment so the pin stays reviewable and
  Dependabot can still bump it. A tag is a mutable pointer: whoever can move
  `actions/checkout@v4` runs code in every job that uses it. This is a script
  rather than a one-off edit because each accepted Dependabot bump reintroduces
  a tag to resolve.
- **A Content-Security-Policy on the web app**, plus `nosniff`,
  `Referrer-Policy`, `X-Frame-Options` and a `Permissions-Policy` that denies
  everything except the microphone the studio's dictation needs. The studio
  already sanitizes rendered Markdown with DOMPurify and that remains the
  primary control; this is the layer that still holds if that call is removed in
  a refactor, because the failure mode of a sanitizer is total.
- **Retention and deletion for stored originals.** Compression stores the
  original first so nothing is ever destroyed — which on a public deployment
  meant strangers' documents kept forever under a handle that is a content hash,
  not an access token. A sourceId travels: it is returned in JSON, printed by
  the CLI, and embedded in `p2md:src` anchors inside Markdown people share.

  Stores now take a TTL. The hosted studio sets **7 days**
  (`P2MD_STORE_TTL_DAYS`); expired records stop resolving and are deleted on
  read, and `sweepExpired()` clears them from disk for deployments with a
  scheduler. `DELETE /api/retrieve?ref=…` withdraws one immediately, and the
  studio offers it next to the sourceId rather than in a policy page.

  A local store has **no TTL by default** and is unchanged: `~/.prompt2md` is
  the operator's own data on their own disk, and having `retrieve_original`
  quietly stop resolving a two-week-old anchor would break losslessness for the
  one person who is not a risk to themselves.

  `/api/capabilities` now reports the window, that an id is a bearer handle, and
  that deletion is available — so the studio can say all three before you paste,
  which is when it matters. **This bounds exposure; it is not per-user
  authorization.** Anyone with an id can still read or delete that record, and
  the UI says so in those words.

- `OriginalStore` gains a required `delete(sourceId)`. Breaking for anyone who
  implemented the interface themselves; both bundled stores implement it.

### Known open

Converted Markdown is not sanitized by default: a `.md` input carrying
`<script>` or `[x](javascript:…)` converts through unchanged, while the HTML
path strips scripts — so the two paths disagree, and neither behaviour is
documented. Preserving input is the right default for a fidelity tool, but the
inconsistency invites the assumption that conversion sanitizes. An opt-in
`--safe-output` and the documentation to go with it are the next release.

The token report also still presents a `chars/4` estimate as a hard
`withinBudget` boolean, with no tokenizer version and no accuracy field. On
tokenizer-hostile content (CJK, dense code) a document reported within budget
can exceed a real `cl100k_base` budget by around 10%.

Neither is a live exploit against the hosted studio, whose preview runs
DOMPurify behind a Content-Security-Policy.

## [0.1.1] — 2026-08-08

### Fixed

- **Refuse decompression bombs.** Office files are ZIP containers, and the
  reader inflated every entry with no ceiling. DEFLATE reaches roughly 1000:1,
  so a 0.1MB `.xlsx` expanding to 60MB was enough to kill the process with a
  heap OOM — and the web app's 25MB upload limit weighs the *compressed* bytes,
  so a conforming upload could ask for about 25GB. Entry sizes are now checked
  against the archive's directory before anything is inflated, so an oversized
  archive is refused without being expanded. The declared size is written by
  whoever made the file, so this stops ordinary bombs rather than a header that
  lies; the caller's byte limit remains the backstop for that case.
- **Filler dedupe is no longer quadratic.** The deterministic no-LLM path
  re-normalized every kept sentence for every new one, which is O(n²) inside a
  paragraph — and a pasted transcript with no blank lines is one paragraph.
  Measured before: 1,000 sentences 269ms, 2,000 1,051ms, 4,000 5,019ms, with
  ~40,000 projecting to minutes. Each sentence is now normalized once, exact
  repeats go through a set at any distance, and the containment scan is bounded
  to a 200-sentence window. 8,000 sentences now complete in a fraction of the
  time 4,000 used to take. Past the window a near-duplicate survives, which
  costs a few tokens and never alters a word.

## [0.1.0] — 2026-08-08

First published release. `prompt2md` (CLI), `@prompt2md/core`, and
`prompt2md-skill` are on npm; `npx prompt2md convert report.pdf` works on a
machine with no Python installed.

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
