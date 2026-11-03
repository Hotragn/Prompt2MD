/*
 * Everything the video says about the product, copied from real runs on
 * 2026-09-30. Nothing here is paraphrased or tidied.
 *
 * PROMPT_RUNS is the landing page's SAMPLE (apps/web/components/LiveFold.tsx),
 * split so the phrases the pipeline dropped can be dimmed. The split was taken
 * by diffing this input against OUTPUT below, not by guessing.
 *
 * OUTPUT is the verbatim markdown from POST prompt2md.vercel.app/api/convert
 * with that sample: report 150 -> 127 tokens, engine prompt-optimizer, no LLM
 * gateway configured.
 *
 * COMPRESSED and RETRIEVED come from `npx prompt2md@0.1.1 compress incident.md
 * -b 300` (1449 -> 475 tokens) and `npx prompt2md@0.1.1 retrieve
 * "p2md:src=c6199e0698ecc214#2874-3278"`, run against the studio's own
 * SAMPLE_CONTEXT. The retrieved span was checked byte-for-byte against the
 * source (404 chars, identical).
 */
(function (g) {
  "use strict";

  const PROMPT_RUNS = [
    { text: "ok so ", filler: true },
    { text: "what i need is " },
    { text: "basically ", filler: true },
    { text: 'a python script that takes a folder of csv files and merges them but ONLY the ones that have a "date" column, and also it should skip empty files. ' },
    { text: "oh and ", filler: true },
    { text: "the output should be a single parquet file. " },
    { text: "also ", filler: true },
    { text: "please use pandas. " },
    { text: "actually ", filler: true },
    { text: "it also needs to handle dates in different formats, some are MM/DD/YYYY and some are ISO. " },
    { text: "like i said ", filler: true },
    { text: "merge them all into one parquet. " },
    { text: "also ", filler: true },
    { text: "add logging. " },
    { text: "did i mention to skip empty files? yeah ", filler: true },
    { text: "skip those. " },
    { text: "one more thing - ", filler: true },
    { text: "if a file fails to parse dont crash, just log it and continue. " },
    { text: "use pandas like i said. thanks!!! also ", filler: true },
    { text: "python 3.11" },
  ];

  const PROMPT = PROMPT_RUNS.map((r) => r.text).join("");

  const OUTPUT = `## Goal

what i need is a python script that takes a folder of csv files and merges them but ONLY the ones that have a "date" column, and also it should skip empty files

## Requirements

- the output should be a single parquet file
- please use pandas
- it also needs to handle dates in different formats, some are MM/DD/YYYY and some are ISO
- add logging
- skip those
- if a file fails to parse dont crash, just log it and continue

## Constraints

- python 3.11

## Notes

- merge them all into one parquet`;

  const REPORT = { inputTokens: 150, outputTokens: 127 };

  const COMPRESS = { rawTokens: 1449, compressedTokens: 475 };

  const COMPRESSED_EXCERPT = [
    "Update 6: engineers investigated subsystem 6 and recorded observations. […]",
    "<!-- p2md:src=c6199e0698ecc214#2468-2872 -->",
    "",
    "Update 7: engineers investigated subsystem 7 and recorded observations. […]",
    "<!-- p2md:src=c6199e0698ecc214#2874-3278 -->",
  ];

  const RETRIEVE_CMD = 'prompt2md retrieve "p2md:src=c6199e0698ecc214#2874-3278"';

  const RETRIEVED =
    "Update 7: engineers investigated subsystem 7 and recorded observations. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Extended narrative describing dashboards, hypotheses, and dead ends in detail. Key finding f-7.";

  const TOOLS = ["Claude Code", "Claude Desktop", "Cursor", "Windsurf", "Gemini CLI", "Codex CLI", "any MCP client"];

  if (PROMPT.length !== 597) {
    // The landing SAMPLE is 597 characters; a mismatch means the runs drifted.
    console.warn("PROMPT length", PROMPT.length);
  }

  g.CONTENT = { PROMPT_RUNS, PROMPT, OUTPUT, REPORT, COMPRESS, COMPRESSED_EXCERPT, RETRIEVE_CMD, RETRIEVED, TOOLS };
})(window);
