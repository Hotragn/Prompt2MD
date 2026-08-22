# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately via GitHub Security Advisories
("Report a vulnerability" on the repository's Security tab) rather than public
issues. Expect an acknowledgement within 72 hours.

## Scope notes for reviewers

- prompt2md processes untrusted documents. The sniffer/router treat all input
  as data; PDF probing is regex-over-bytes with no code execution.
- The originals store is content-addressed; source ids are validated against
  `^[0-9a-f]{16}$` before any filesystem path is built (path-traversal guard,
  covered by tests).
- The MCP server binds stdio only. docling-serve and LiteLLM sidecars have no
  auth of their own — deploy them on localhost or behind your own gateway; do
  not expose them publicly.

### Filesystem scope (MCP)

The MCP `convert` tool takes a `path`, and its caller is a language model, not
the operator. It therefore reads **only** inside directories the operator names
in `P2MD_WORKSPACE_ROOTS` (`;`-separated on Windows, `:` elsewhere):

```
P2MD_WORKSPACE_ROOTS=/home/me/projects:/home/me/docs
```

- **Unset means no file access at all**, not unrestricted access. A config
  mistake fails closed.
- Paths are canonicalized with `realpath` *before* the containment test, so a
  symlink inside a root that points outside it is refused.
- URLs (`http:`, `https:`, `file:`, `data:`), UNC paths and null bytes are
  rejected outright. `convert` reads local files; it never fetches remote
  content.
- Refusals are deliberately uninformative — they do not echo the resolved path
  or reveal whether it exists.
- Files over `P2MD_MAX_INPUT_BYTES` (default 100MB) are refused on their
  declared size, before being read. The in-process PDF reader stops at
  `P2MD_MAX_PDF_PAGES` (default 2000) and warns when it truncates.

The **CLI** is deliberately not subject to this: a path typed at your own shell
grants no authority you did not already have. The boundary exists because the
MCP caller is untrusted, not because the pipeline is.

### Stored originals, retention, and what a sourceId is

Compression stores the original before touching it — that is what makes
`retrieve_original` byte-exact and compression non-destructive. Two properties
of that store are worth stating plainly rather than leaving to be discovered:

- **A sourceId is a bearer handle, not an owned resource.** It is a content
  hash, which makes it a good deduplication key and a poor access token. Nothing
  ties a record to whoever submitted it, so on a shared deployment anyone
  holding an id can read *or delete* that record. Ids travel: they are returned
  in API responses, printed by the CLI, and embedded in `p2md:src` anchors
  inside Markdown people paste elsewhere. Treat one like a link to the document.
- **Retention is bounded on shared deployments and unbounded locally.** The
  hosted studio keeps submitted documents for 7 days
  (`P2MD_STORE_TTL_DAYS`); expired records stop resolving and are deleted on
  read. `DELETE /api/retrieve?ref=<anchor|sourceId>` withdraws one immediately.
  A local store has no TTL by default, because `~/.prompt2md` is your own data
  on your own disk.

If you run prompt2md as a multi-tenant service, set `P2MD_STORE_TTL_DAYS` and
understand that a TTL bounds exposure without providing per-user authorization.
For anything you would not paste into a public form, run the CLI locally.

### Data egress

No document content leaves the machine unless you configure an LLM gateway.
With `P2MD_LITELLM_BASE_URL` set, optimizer and summarizer prompts — which
contain your content — are sent to the models you configured. prompt2md itself
collects no telemetry and makes no update checks.
