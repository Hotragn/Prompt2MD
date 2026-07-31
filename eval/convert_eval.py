"""Text-to-Markdown evaluation and prompt optimization, built on DSPy.

Two jobs, cleanly separated:

1. EVALUATE (works offline, no API key): score conversion quality over the
   fixture corpus with a deterministic metric. The program under evaluation is
   the REAL pipeline, invoked through the built CLI - so this measures what
   users actually get, not a reimplementation.

       python eval/convert_eval.py

2. OPTIMIZE (needs an LLM endpoint): compile a better system prompt for the
   LLM optimizer path with MIPROv2, scored by the same metric, and export the
   winning instruction text as an artifact the TypeScript engine loads via
   P2MD_OPTIMIZER_SYSTEM_PROMPT_FILE. DSPy talks to any OpenAI-compatible
   endpoint, which matches the project's LiteLLM stance exactly.

       P2MD_LITELLM_BASE_URL=... P2MD_MODEL=... P2MD_LITELLM_API_KEY=... \
           python eval/convert_eval.py --llm --optimize

Where DSPy deliberately does NOT go in this project: the deterministic path
(regex and structure, no LM), routing (byte probes), and anything on the
losslessness guarantee - those stay hand-written and unit-tested. DSPy's fit
is exactly the two places a prompt is the product: the optimizer's system
prompt and (future target) the compression summarizer's.

The metric is the same standard the test suite enforces: load-bearing facts
must survive, output must not balloon, and structure should appear when the
input is substantial. A prompt that scores well here scores well against the
project's own definition of quality - there is one definition, not two.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import dspy

REPO = Path(__file__).resolve().parent.parent
CLI = REPO / "packages" / "cli" / "dist" / "index.js"
CASES = REPO / "fixtures" / "cases"
ARTIFACTS = Path(__file__).resolve().parent / "artifacts"

TEXT_INPUTS = ("input.txt", "input.html", "input.csv", "input.extracted.txt", "input.ocr-raw.txt")

FACT_PATTERNS = [
    re.compile(r"\$[\d,]+(?:\.\d+)?"),          # currency
    re.compile(r"\b\d+(?:\.\d+)?%"),             # percentages
    re.compile(r"\b\d{4}-\d{2}-\d{2}\b"),        # ISO dates
    re.compile(r"\b[A-Z]{2,}-\d{3,}\b"),         # ticket / invoice identifiers
    re.compile(r"\b\d{1,3}(?:,\d{3})+\b"),       # grouped numbers
    re.compile(r"\b\d+\.\d+\.\d+\b"),            # versions
]


def load_bearing_facts(text: str) -> set[str]:
    found: set[str] = set()
    for pattern in FACT_PATTERNS:
        found.update(pattern.findall(text))
    return found


def load_devset() -> list[dspy.Example]:
    """Fixture corpus -> DSPy examples. Binary-only cases are excluded; their
    text-extraction stand-ins are used where the corpus provides them."""
    examples = []
    for case_dir in sorted(CASES.iterdir()):
        meta_path = case_dir / "case.json"
        if not meta_path.exists():
            continue
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        source = next((case_dir / name for name in TEXT_INPUTS if (case_dir / name).exists()), None)
        if source is None:
            continue
        examples.append(
            dspy.Example(
                text=source.read_text(encoding="utf-8"),
                case_id=meta["id"],
                max_ratio=float(meta.get("tokens", {}).get("maxRatio", 1.05)),
            ).with_inputs("text")
        )
    return examples


def conversion_metric(example: dspy.Example, prediction, trace=None) -> float:
    """0..1. The same standard the test suite enforces, so evaluation and
    optimization share ONE definition of quality with the product itself:
      0.6 - load-bearing facts from the input survive in the output
      0.2 - output does not balloon (case.json maxRatio; fidelity cases allow growth)
      0.2 - markdown structure present when the input is substantial
    """
    markdown = getattr(prediction, "markdown", "") or ""
    if not markdown.strip():
        return 0.0

    facts = load_bearing_facts(example.text)
    fact_score = 1.0 if not facts else sum(1 for f in facts if f in markdown) / len(facts)

    ratio = (len(markdown) / max(len(example.text), 1))
    size_score = 1.0 if ratio <= example.max_ratio else max(0.0, 1 - (ratio - example.max_ratio))

    substantial = len(example.text) > 400
    structured = bool(re.search(r"^#{1,6} |^- |^\||\n\|", markdown, re.M))
    structure_score = 1.0 if (structured or not substantial) else 0.0

    return round(0.6 * fact_score + 0.2 * size_score + 0.2 * structure_score, 4)


class RealPipeline(dspy.Module):
    """The shipped converter as a DSPy program: measures what users get."""

    def forward(self, text: str):
        run = subprocess.run(
            ["node", str(CLI), "convert", "--text", text, "--json"],
            capture_output=True, text=True, encoding="utf-8", timeout=180, cwd=REPO,
        )
        if run.returncode != 0:
            return dspy.Prediction(markdown="")
        try:
            return dspy.Prediction(markdown=json.loads(run.stdout)["markdown"])
        except (json.JSONDecodeError, KeyError):
            return dspy.Prediction(markdown="")


class ConvertToMarkdown(dspy.Signature):
    """Convert raw text into clean, token-efficient Markdown. Preserve every
    requirement, fact, number, name, constraint, and date verbatim - never
    invent or embellish. Deduplicate repeated instructions. Structure with
    one title, short sections, bullets for enumerable items, and tables for
    field/value data. Strip greetings, sign-offs, quoted history, and legal
    footers. Output only the Markdown document."""

    text: str = dspy.InputField(desc="raw text: a rambling prompt, email thread, or document")
    markdown: str = dspy.OutputField(desc="the token-efficient Markdown document, nothing else")


def configure_llm() -> bool:
    base = os.environ.get("P2MD_LITELLM_BASE_URL")
    model = os.environ.get("P2MD_MODEL", "gpt-4o-mini")
    if base is None:
        return False
    dspy.configure(lm=dspy.LM(
        f"openai/{model}",
        api_base=base,
        api_key=os.environ.get("P2MD_LITELLM_API_KEY", "not-needed"),
        temperature=0.0,
    ))
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--llm", action="store_true", help="evaluate the DSPy LLM program instead of the shipped pipeline")
    parser.add_argument("--optimize", action="store_true", help="compile a better system prompt with MIPROv2 and export it")
    args = parser.parse_args()

    if not CLI.exists():
        print("build the CLI first: pnpm build", file=sys.stderr)
        return 1

    devset = load_devset()
    print(f"devset: {len(devset)} cases from the fixture corpus\n")

    if args.llm or args.optimize:
        if not configure_llm():
            print("--llm/--optimize need P2MD_LITELLM_BASE_URL (any OpenAI-compatible endpoint)", file=sys.stderr)
            return 1
        program: dspy.Module = dspy.Predict(ConvertToMarkdown)
    else:
        program = RealPipeline()

    if args.optimize:
        optimizer = dspy.MIPROv2(metric=conversion_metric, auto="light")
        compiled = optimizer.compile(program, trainset=devset)
        ARTIFACTS.mkdir(exist_ok=True)
        compiled.save(str(ARTIFACTS / "optimized_program.json"))
        # Hand the winning instruction text to the TypeScript engine.
        instructions = compiled.signature.instructions
        (ARTIFACTS / "system_prompt.txt").write_text(instructions, encoding="utf-8")
        print(f"\noptimized system prompt -> {ARTIFACTS / 'system_prompt.txt'}")
        print("use it: set P2MD_OPTIMIZER_SYSTEM_PROMPT_FILE to that path")
        program = compiled

    scores = []
    for example in devset:
        prediction = program(text=example.text)
        score = conversion_metric(example, prediction)
        scores.append(score)
        print(f"  {example.case_id:<28} {score:.2f}")

    mean = sum(scores) / max(len(scores), 1)
    print(f"\nmean score: {mean:.3f}  ({'shipped pipeline' if isinstance(program, RealPipeline) else 'DSPy LLM program'})")
    return 0 if mean >= 0.6 else 1


if __name__ == "__main__":
    sys.exit(main())
