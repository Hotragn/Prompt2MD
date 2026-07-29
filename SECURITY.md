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
- No document content leaves the machine unless you configure an LLM gateway;
  with `P2MD_LITELLM_BASE_URL` set, optimizer/summarizer prompts are sent to
  the models you configured. prompt2md itself collects no telemetry.
