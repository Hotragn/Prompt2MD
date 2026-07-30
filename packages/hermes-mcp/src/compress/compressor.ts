import {
  CACHE_PROFILES,
  approxCounter,
  orderForCache,
  parseMarkdown,
  renderMarkdown,
  type CacheProvider,
  type ConversionWarning,
  type MarkdownDoc,
  type MarkdownSection,
  type TokenCounter,
} from "@prompt2md/core";
import { formatAnchor, type OriginalStore } from "../store.js";
import { stripBoilerplate } from "./boilerplate.js";
import { createExtractiveSummarizer, type Summarizer } from "./summarize.js";
import { buildSavings, type PhaseTrace, type SavingsReport } from "./savings.js";

/**
 * The 4-phase compression pipeline (ADR-003):
 *   1. STRUCTURE  — parse into the MarkdownDoc IR (spans anchor the original)
 *   2. STRIP      — deterministic boilerplate removal + dedupe
 *   3. SUMMARIZE  — middle-context summarization: head and tail stay verbatim
 *                   (lost-in-the-middle mitigation), structure-critical kinds
 *                   (tables/code/headings) are never summarized
 *   4. LAYOUT     — cache-aligned reassembly: stable prefix first, explicit
 *                   breakpoint marker, volatile metadata last
 *
 * Never destructive: the original is stored first, and every summarized
 * section carries a p2md:src anchor resolvable via retrieve_original.
 */

export interface CompressOptions {
  readonly tokenBudget: number;
  readonly provider?: CacheProvider;
  /** Verbatim head budget. Default: min(25% of budget, 2000). */
  readonly headTokens?: number;
  /** Verbatim tail budget. Default: min(15% of budget, 1000). */
  readonly tailTokens?: number;
  readonly counter?: TokenCounter;
  readonly summarizer?: Summarizer;
  /** Sections below this size are never summarized (overhead beats savings). Default 24. */
  readonly minSectionTokens?: number;
}

export interface CompressResult {
  readonly sourceId: string;
  readonly doc: MarkdownDoc;
  readonly markdown: string;
  readonly savings: SavingsReport;
}

const SUMMARIZABLE = new Set<MarkdownSection["kind"]>(["paragraph", "list", "blockquote", "figure"]);

export async function compressContext(
  text: string,
  store: OriginalStore,
  options: CompressOptions,
): Promise<CompressResult> {
  const counter = options.counter ?? approxCounter;
  const summarizer = options.summarizer ?? createExtractiveSummarizer(counter);
  const minSectionTokens = options.minSectionTokens ?? 24;
  const budget = options.tokenBudget;
  const profile = CACHE_PROFILES[options.provider ?? "anthropic"];
  const warnings: ConversionWarning[] = [];

  // Losslessness first: persist the original before touching it.
  const sourceId = await store.put(text, "compress_context");

  // Phase 1 — structure
  let doc = parseMarkdown(text, counter);
  const phases: PhaseTrace[] = [{ phase: "structure", tokens: totalTokens(doc) }];

  // Phase 2 — strip
  doc = stripBoilerplate(doc, counter).doc;
  phases.push({ phase: "strip", tokens: totalTokens(doc) });

  // Phase 3 — middle-context summarization (only when still over budget)
  if (totalTokens(doc) > budget) {
    doc = await summarizeMiddle(doc, {
      budget,
      headTokens: options.headTokens ?? Math.min(Math.floor(budget * 0.25), 2000),
      tailTokens: options.tailTokens ?? Math.min(Math.floor(budget * 0.15), 1000),
      minSectionTokens,
      counter,
      summarizer,
    });
    if (totalTokens(doc) > budget) {
      warnings.push({
        code: "budget-exceeded",
        message: `still ${totalTokens(doc)} tokens after summarizing all eligible middle sections (budget ${budget}); tables/code/headings are preserved verbatim by design`,
      });
    }
  }
  phases.push({ phase: "summarize", tokens: totalTokens(doc) });

  // Phase 4 — cache-aligned reassembly. Cache-breakpoint and generation-stamp
  // markers cost a handful of tokens; on an already-small input that
  // overhead can exceed what phases 2-3 saved. Rather than hand back
  // something bigger than the raw input, skip layout metadata for inputs it
  // can't possibly help (repeat-call caching only pays off at real size).
  const rawTokens = counter.count(text);
  const preLayout = doc;
  const laidOut = alignForCache(doc, profile.breakpointStyle === "explicit", counter);
  const layoutHelps = totalTokens(preLayout) < rawTokens ? totalTokens(laidOut) < rawTokens : true;
  doc = layoutHelps ? laidOut : preLayout;
  phases.push({ phase: "layout", tokens: totalTokens(doc) });
  if (!layoutHelps) {
    warnings.push({
      code: "layout-skipped",
      message:
        "input is small enough that cache-breakpoint/generation-stamp overhead would exceed the input size; layout metadata skipped",
    });
  }

  doc = { ...doc, warnings: [...doc.warnings, ...warnings] };
  return {
    sourceId,
    doc,
    markdown: renderMarkdown(doc),
    savings: buildSavings(counter.count(text), doc, phases, profile),
  };
}

function totalTokens(doc: MarkdownDoc): number {
  return doc.sections.reduce((n, s) => n + s.tokens, 0);
}

interface MiddleOptions {
  readonly budget: number;
  readonly headTokens: number;
  readonly tailTokens: number;
  readonly minSectionTokens: number;
  readonly counter: TokenCounter;
  readonly summarizer: Summarizer;
}

async function summarizeMiddle(doc: MarkdownDoc, opts: MiddleOptions): Promise<MarkdownDoc> {
  const sections = [...doc.sections];

  // Protect the head and tail: models attend to them best, so they stay verbatim.
  let headEnd = 0;
  for (let cum = 0; headEnd < sections.length; headEnd++) {
    cum += sections[headEnd]!.tokens;
    if (cum >= opts.headTokens) {
      headEnd++;
      break;
    }
  }
  let tailStart = sections.length;
  for (let cum = 0; tailStart > headEnd; ) {
    const next = sections[tailStart - 1]!.tokens;
    if (cum + next > opts.tailTokens) break;
    cum += next;
    tailStart--;
  }

  // Largest summarizable middle sections first: best savings per LLM call.
  const candidates = sections
    .map((section, index) => ({ section, index }))
    .filter(
      ({ section, index }) =>
        index >= headEnd &&
        index < tailStart &&
        SUMMARIZABLE.has(section.kind) &&
        section.tokens >= opts.minSectionTokens,
    )
    .sort((a, b) => b.section.tokens - a.section.tokens);

  let total = sections.reduce((n, s) => n + s.tokens, 0);

  // Adaptive shrink: whatever budget remains after protected sections is
  // shared by the candidates proportionally. Fixed per-section ratios cannot
  // reach aggressive budgets once head/tail protection and anchor overhead
  // are accounted for.
  const candidateTokens = candidates.reduce((n, c) => n + c.section.tokens, 0);
  const protectedTokens = total - candidateTokens;
  const shrink = Math.min(0.5, Math.max(0, (opts.budget - protectedTokens) / Math.max(candidateTokens, 1)));

  for (const { section, index } of candidates) {
    if (total <= opts.budget) break;
    const anchorOverhead =
      section.source !== undefined ? opts.counter.count(formatAnchor(section.source)) + 1 : 0;
    const target = Math.max(10, Math.floor(section.tokens * shrink) - anchorOverhead);
    const summary = await opts.summarizer.summarize(section.markdown, target);
    const anchored =
      section.source !== undefined ? `${summary}\n${formatAnchor(section.source)}` : summary;
    const compressed: MarkdownSection = {
      ...section,
      markdown: anchored,
      tokens: opts.counter.count(anchored),
      compressed: true,
    };
    if (compressed.tokens >= section.tokens) continue; // summary didn't help; keep verbatim
    total = total - section.tokens + compressed.tokens;
    sections[index] = compressed;
  }

  return { ...doc, sections };
}

/**
 * Stable prefix first, then an explicit breakpoint marker (providers with
 * explicit-style caching), then volatile sections, then a generation stamp —
 * the only genuinely per-run content, so it always sits last.
 */
function alignForCache(doc: MarkdownDoc, explicitBreakpoint: boolean, counter: TokenCounter): MarkdownDoc {
  const ordered = orderForCache(doc);
  const sections = [...ordered.sections];

  if (explicitBreakpoint) {
    let boundary = 0;
    while (boundary < sections.length && sections[boundary]!.volatility === "stable") boundary++;
    const marker = "<!-- p2md:cache-breakpoint -->";
    sections.splice(boundary, 0, {
      id: "cache-breakpoint",
      kind: "metadata",
      markdown: marker,
      tokens: counter.count(marker),
      volatility: "stable",
    });
  }

  const stamp = `<!-- p2md:generated ${new Date().toISOString()} source=${doc.sourceId} -->`;
  sections.push({
    id: "generation-stamp",
    kind: "metadata",
    markdown: stamp,
    tokens: counter.count(stamp),
    volatility: "volatile",
  });

  return { ...ordered, sections };
}
