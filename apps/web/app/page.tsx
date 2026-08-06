import Link from "next/link";
import { Chapter } from "../components/Chapter";
import { Count } from "../components/Count";
import { FoldStory } from "../components/FoldStory";
import { LiveFold } from "../components/LiveFold";
import { Reveal } from "../components/Reveal";
import { SUPPORTED_TOOLS, TOTAL_TESTS } from "../lib/facts";

export const metadata = {
  title: "prompt2md: token-optimized Markdown, and proof of what it saved",
};

const SURFACES = [
  {
    id: "cli",
    name: "Command line",
    body: `prompt2md convert ./contract.pdf -b 6000
prompt2md compress big-context.md -b 4000
prompt2md batch "docs/**/*.html" -d out/ --watch
prompt2md retrieve "p2md:src=<id>#<start>-<end>"`,
  },
  {
    id: "mcp",
    name: "MCP server",
    body: `{
  "mcpServers": {
    "prompt2md": {
      "command": "node",
      "args": ["<repo>/packages/hermes-mcp/dist/bin.js"]
    }
  }
}`,
  },
  {
    id: "skill",
    name: "Agent skill",
    body: `cp -r packages/skill/prompt2md ~/.claude/skills/

# then, in any conversation:
/prompt2md convert this thread to markdown`,
  },
];

const PIPELINE = [
  { step: "Sniff", detail: "Cheap byte-level probes read the content itself, never the file extension." },
  { step: "Route", detail: "Fast path for text-layer PDFs, HTML, Office, CSV. High-fidelity path for scans and complex tables." },
  { step: "Escalate", detail: "The fast path's output is inspected for damage. Degraded tables or low yield trigger a re-run on the heavy engine." },
  { step: "Optimize", detail: "Boilerplate, navigation chrome, signatures, and duplicated passages come out. Structure stays." },
  { step: "Layout", detail: "Stable content first, volatile last, provider-specific cache breakpoints in between." },
];

export default function Home() {
  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="hero">
        <div className="container">
          <Reveal>
            <p className="eyebrow">Open source, Apache-2.0</p>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="hero-title">
              Fold any text into <span className="grad">token&#8209;optimized Markdown</span>
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="hero-sub">
              Other tools cut and hope. prompt2md folds: smaller Markdown, honest token numbers,
              and the byte-exact original back on demand.
            </p>
          </Reveal>

          <Reveal delay={180}>
            <div className="hero-cta">
              <Link className="btn" href="/studio">
                Open the studio
              </Link>
              <a className="btn ghost" href="#install">
                Install in your tools
              </a>
            </div>
          </Reveal>

          <Reveal delay={240}>
            <LiveFold />
          </Reveal>

          <Reveal delay={280}>
            <p className="scroll-cue">
              <span>↓</span> Watch it fold, chapter one
            </p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ proof bar */}
      <section className="proof">
        <div className="container proof-row">
          <Reveal className="proof-item">
            <strong>
              <Count value={TOTAL_TESTS} display={String(TOTAL_TESTS)} />
            </strong>
            <span>tests, green on Linux &amp; Windows</span>
          </Reveal>
          <Reveal className="proof-item" delay={60}>
            <strong>0</strong>
            <span>telemetry, accounts, or uploads</span>
          </Reveal>
          <Reveal className="proof-item" delay={120}>
            <strong>
              <Count value={SUPPORTED_TOOLS} display={String(SUPPORTED_TOOLS)} />
            </strong>
            <span>tools wired by one command</span>
          </Reveal>
          <Reveal className="proof-item" delay={180}>
            <strong>
              <Count value={100} display="100%" />
            </strong>
            <span>of savings figures reproducible</span>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------- the fold story */}
      <section className="section" id="why">
        <div className="container">
          <Reveal>
            <Chapter n={1} total={6} label="The Fold" />
            <h2 className="section-title">Everything else cuts. This folds.</h2>
            <p className="section-lead">
              The distinction is not stylistic. It is the difference between a transformation you can
              undo and one you cannot.
            </p>
          </Reveal>

          <FoldStory />

          <Reveal>
            <p className="section-lead small" style={{ marginTop: 56 }}>
              The story is the architecture: the original is stored, content&#8209;addressed, before
              anything is transformed.
            </p>
          </Reveal>

          <div className="compare">
            <Reveal className="compare-col" delay={60}>
              <h3 className="compare-h cut">Cutting</h3>
              <ul>
                <li>Truncates to fit a window</li>
                <li>Drops the middle and hopes</li>
                <li>Summaries replace the source</li>
                <li>Savings are estimated, or unstated</li>
                <li>The detail is gone for good</li>
              </ul>
            </Reveal>
            <Reveal className="compare-col fold" delay={120}>
              <h3 className="compare-h">Folding</h3>
              <ul>
                <li>Structures, dedupes, then summarizes only what is safe</li>
                <li>Head and tail stay verbatim, because models attend to them most</li>
                <li>Tables, code, and headings are never summarized</li>
                <li>Every figure comes from a real run you can repeat</li>
                <li>
                  <code>retrieve_original</code> returns the exact source bytes
                </li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- how it works */}
      <section className="section alt" id="how">
        <div className="container">
          <Reveal>
            <Chapter n={2} total={6} label="The Mechanism" />
            <h2 className="section-title">How a document becomes cheap context</h2>
            <p className="section-lead">
              Five stages. The interesting one is the third: the pipeline checks its own work and
              escalates when the cheap engine got it wrong.
            </p>
          </Reveal>

          <ol className="pipeline">
            {PIPELINE.map((p, i) => (
              <Reveal as="li" key={p.step} delay={i * 70} className="pipeline-step">
                <h3>{p.step}</h3>
                <p>{p.detail}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------------------- features */}
      <section className="section" id="features">
        <div className="container">
          <Reveal>
            <Chapter n={3} total={6} label="The Proof" />
            <h2 className="section-title">Built for context budgets, not demos</h2>
          </Reveal>

          <div className="bento">
            <Reveal className="tile wide" delay={40}>
              <h3>Token cost is an output, not a footnote</h3>
              <p>
                Every conversion returns a report: tokens in, tokens out, compression ratio,
                per-section costs, and the effective cost of each repeat call under your
                provider&rsquo;s cache pricing. Set a budget and it is enforced, not suggested.
              </p>
            </Reveal>
            <Reveal className="tile" delay={80}>
              <h3>Lossless by construction</h3>
              <p>
                Originals are stored content-addressed before anything is transformed. Summarized
                sections carry <code>p2md:src</code> anchors that resolve to exact bytes.
              </p>
            </Reveal>
            <Reveal className="tile" delay={120}>
              <h3>Dual-engine routing</h3>
              <p>
                ~0.6 s fast path for most inputs; TableFormer and OCR only when the content proves it
                needs them.
              </p>
            </Reveal>
            <Reveal className="tile" delay={160}>
              <h3>Cache-aware layout</h3>
              <p>
                Sections are ordered so prompt caches hit. Repeat calls can cost a fraction of the
                first one.
              </p>
            </Reveal>
            <Reveal className="tile wide" delay={200}>
              <h3>Works with nothing installed</h3>
              <p>
                No API key, no sidecar, no account. With zero configuration you get deterministic
                cleanup and honest numbers; add an LLM gateway and the same pipeline restructures far
                more aggressively. Text input never hard-fails.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- surfaces */}
      <section className="section alt" id="surfaces">
        <div className="container">
          <Reveal>
            <Chapter n={4} total={6} label="The Surfaces" />
            <h2 className="section-title">Four surfaces, one pipeline</h2>
            <p className="section-lead">
              The same engine behind a command line, an MCP server, an agent skill, and this studio.
            </p>
          </Reveal>

          <div className="surfaces">
            {SURFACES.map((s, i) => (
              <Reveal key={s.id} delay={i * 80} className="surface">
                <div className="win">
                  <div className="win-bar">
                    <span className="win-name">{s.name}</span>
                  </div>
                  <pre className="win-body">{s.body}</pre>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- install */}
      <section className="section" id="install">
        <div className="container">
          <Reveal>
            <Chapter n={5} total={6} label="The Access" />
            <h2 className="section-title">One command wires every tool you use</h2>
            <p className="section-lead">
              Detects what is installed, backs up every config before touching it, and is safe to
              re-run. Preview it first with <code>--dry-run</code>.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <div className="win install-win">
              <div className="win-bar">
                <span className="win-name">setup</span>
              </div>
              <pre className="win-body">{`git clone https://github.com/Hotragn/Prompt2MD.git prompt2md
cd prompt2md && pnpm install && pnpm build
pnpm setup`}</pre>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <ul className="tool-list">
              {[
                "Claude Code",
                "Claude Desktop",
                "Cursor",
                "Windsurf",
                "Gemini CLI",
                "Codex CLI",
                "any MCP client",
              ].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="section-lead small">
              Model providers are independent of the tool: point <code>P2MD_LITELLM_BASE_URL</code> at
              any OpenAI-compatible endpoint. Claude, GPT, Gemini, Grok, Kimi, or a local model.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------- cta */}
      <section className="section cta-band">
        <div className="container">
          <Reveal>
            <Chapter n={6} total={6} label="The Invitation" />
            <h2 className="section-title">See it fold something of yours</h2>
            <p className="section-lead">
              Paste a rambling prompt, a contract, or an email thread. You will get clean Markdown, a
              number you can check, and a way back to the original.
            </p>
            <div className="hero-cta">
              <Link className="btn" href="/studio">
                Open the studio
              </Link>
              <a
                className="btn ghost"
                href="https://github.com/Hotragn/Prompt2MD"
                target="_blank"
                rel="noreferrer"
              >
                Read the source
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
