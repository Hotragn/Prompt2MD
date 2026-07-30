import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/markdown/parse.js";
import { stripBoilerplate } from "../src/optimize/boilerplate.js";
import { approxCounter } from "../src/tokens/counter.js";
import { renderMarkdown } from "../src/types/document.js";

function strip(markdown: string): string {
  return renderMarkdown(stripBoilerplate(parseMarkdown(markdown, approxCounter), approxCounter).doc);
}

describe("document boilerplate rules (OPTIMIZE stage)", () => {
  it("drops cookie banners and newsletter chrome", () => {
    const out = strip(
      "We use cookies to improve your experience. Accept all Manage preferences\n\nReal article sentence.\n\n📬 Enjoying this? Get it in your inbox. Sign up free",
    );
    expect(out).toBe("Real article sentence.");
  });

  it("drops nav/related link-only lists but keeps content lists", () => {
    const nav = "* [Home](/)\n* [Tech](/tech)\n* [Subscribe](/subscribe)";
    const related = "- [Sodium-ion ships](/a/1)\n- [Grid storage boom](/a/2)";
    const content = "- Energy density: ~500 Wh/kg demonstrated\n- Charge time: under 12 minutes";
    const out = strip(`${nav}\n\nBody text.\n\n${related}\n\n${content}`);
    expect(out).not.toContain("[Home](/)");
    expect(out).not.toContain("Sodium-ion");
    expect(out).toContain("Energy density");
  });

  it("drops ad figures and copyright footers, keeps normal figures", () => {
    const out = strip(
      "![Advertisement](/ads/banner.gif)\n\n![Diagram of the pipeline](/img/arch.png)\n\nBody.\n\n© 2026 TechWire Daily · [Privacy](/privacy)",
    );
    expect(out).not.toContain("Advertisement");
    expect(out).not.toContain("© 2026");
    expect(out).toContain("Diagram of the pipeline");
  });

  it("prunes headings whose entire content was stripped (and trailing ones)", () => {
    const out = strip(
      "# Article\n\nBody paragraph.\n\n### Related stories\n\n- [One](/a)\n- [Two](/b)",
    );
    expect(out).toContain("# Article");
    expect(out).toContain("Body paragraph.");
    expect(out).not.toContain("Related stories");
  });

  it("keeps headings whose sections survive", () => {
    const out = strip("# T\n\n## Keep me\n\nContent under the heading.");
    expect(out).toContain("## Keep me");
  });

  it("is idempotent", () => {
    const once = strip("* [Home](/)\n* [Docs](/d)\n\nReal content.\n\n© 2026 Corp");
    expect(strip(once)).toBe(once);
  });
});
