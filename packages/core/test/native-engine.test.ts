import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { createNativeEngine, detectOoxml } from "../src/engines/native/index.js";
import { columnIndex } from "../src/engines/native/xlsx.js";
import { csvToMarkdown, jsonToMarkdown, splitCsvLine } from "../src/engines/native/text-formats.js";
import { toMarkdownTable } from "../src/engines/native/ooxml.js";
import { detectTableDegradation } from "../src/router/escalation.js";
import { sniffText } from "../src/router/sniffer.js";
import type { SniffReport } from "../src/types/engine.js";

/**
 * The in-process engine is what a machine with no Python actually runs, so
 * these cover the cases where "it produced output" and "it produced correct
 * output" come apart.
 */

const engine = createNativeEngine();

describe("refusing a decompression bomb", () => {
  it("rejects an archive that declares more than it may expand to", async () => {
    // A few hundred KB on disk, ~120MB inflated. DEFLATE reaches about
    // 1000:1, so a 25MB upload — inside the web app's limit, which weighs the
    // COMPRESSED bytes — expands to roughly 25GB. Unguarded, this killed the
    // process outright with a heap OOM rather than returning an error.
    const filler = "A".repeat(120 * 1024 * 1024);
    const bomb = zipSync({
      "xl/workbook.xml": strToU8('<?xml version="1.0"?><workbook><sheets/></workbook>'),
      "xl/sharedStrings.xml": strToU8(`<?xml version="1.0"?><sst><si><t>${filler}</t></si></sst>`),
    });
    // The point of the guard: it refuses cheaply, on the declared size,
    // without ever inflating the entry.
    expect(bomb.length).toBeLessThan(2 * 1024 * 1024);

    await expect(
      engine.convert({ kind: "buffer", data: bomb, filename: "bomb.xlsx" }, sniff("office", bomb.length), {}),
    ).rejects.toThrow(/refusing to expand|over the .*limit/i);
  });

  it("still opens an ordinary workbook", async () => {
    // The ceiling must sit far above any honest document.
    const ok = zipSync({
      "xl/workbook.xml": strToU8(
        '<?xml version="1.0"?><workbook><sheets><sheet name="S1" sheetId="1" r:id="rId1"/></sheets></workbook>',
      ),
      "xl/worksheets/sheet1.xml": strToU8(
        '<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Header</t></is></c></row></sheetData></worksheet>',
      ),
    });
    const result = await engine.convert(
      { kind: "buffer", data: ok, filename: "fine.xlsx" },
      sniff("office", ok.length),
      {},
    );
    expect(result.markdown).toContain("Header");
  });
});

function sniff(kind: SniffReport["kind"], bytes = 0): SniffReport {
  return { kind, mime: "application/octet-stream", bytes };
}

describe("CSV", () => {
  it("keeps delimiters and escaped quotes inside quoted fields", () => {
    // A naive split on commas corrupts every address and quoted sentence in a
    // real file, and does it silently.
    expect(splitCsvLine('"Ada, A",eng,"said ""hi"""', ",")).toEqual([
      "Ada, A",
      "eng",
      'said "hi"',
    ]);
  });

  it("keeps a row together when a quoted field contains a newline", async () => {
    const csv = 'name,note\n"Ada","line one\nline two"\n';
    const result = await engine.convert({ kind: "text", text: csv }, sniff("csv"), {});
    // Splitting on physical newlines would invent a third row here.
    expect(result.markdown.split("\n").filter((l) => l.startsWith("|"))).toHaveLength(3);
    expect(result.markdown).toContain("line one line two");
  });

  it("detects a tab-separated file", () => {
    expect(csvToMarkdown("a\tb\tc\n1\t2\t3")).toContain("| a | b | c |");
  });

  it("escapes a pipe so one cell cannot break the table", () => {
    expect(csvToMarkdown("a,b\nx|y,z")).toContain("x\\|y");
  });
});

describe("JSON", () => {
  it("renders an array of flat objects as a table, not repeated keys", () => {
    const md = jsonToMarkdown('[{"id":1,"name":"a"},{"id":2,"name":"b"}]');
    expect(md).toContain("| id | name |");
    expect(md).not.toContain("```");
  });

  it("keeps nested shapes verbatim rather than inventing a flattening", () => {
    const md = jsonToMarkdown('{"a":{"b":1}}');
    expect(md).toContain("```json");
  });

  it("hands back non-JSON untouched instead of asserting a shape", () => {
    expect(jsonToMarkdown("not json at all")).toBe("not json at all");
  });
});

describe("HTML", () => {
  it("drops script and style TEXT, not just their tags", async () => {
    const html = "<html><head><style>.a{color:red}</style></head><body><script>var x=1</script><p>Hi</p></body></html>";
    const result = await engine.convert({ kind: "text", text: html }, sniff("html"), {});
    // Turndown ignores the tag names but leaks their text nodes, and minified
    // CSS is about the worst thing there is to spend a token budget on.
    expect(result.markdown).not.toContain("color:red");
    expect(result.markdown).not.toContain("var x");
    expect(result.markdown).toContain("Hi");
  });

  it("keeps a table as a table", async () => {
    const html = "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>";
    const result = await engine.convert({ kind: "text", text: html }, sniff("html"), {});
    expect(result.markdown).toContain("| A | B |");
    expect(result.markdown).toContain("| 1 | 2 |");
  });

  it("strips the chrome that repeats on every page of a site", async () => {
    const html = "<body><nav>Home About</nav><h1>Real</h1><footer>(c) 2026</footer></body>";
    const result = await engine.convert({ kind: "text", text: html }, sniff("html"), {});
    expect(result.markdown).toContain("Real");
    expect(result.markdown).not.toContain("Home About");
    expect(result.markdown).not.toContain("2026");
  });

  it("actually reduces tokens, which is the entire claim for HTML", async () => {
    const html = "<html><head><style>.x{color:red;font-size:12px}</style></head><body><nav>a b c</nav><h1>T</h1><p>Body text here.</p></body></html>";
    const result = await engine.convert({ kind: "text", text: html }, sniff("html"), {});
    expect(result.markdown.length).toBeLessThan(html.length / 2);
  });
});

describe("spreadsheet cell addressing", () => {
  it("maps column letters past Z", () => {
    expect(columnIndex("A1")).toBe(0);
    expect(columnIndex("Z9")).toBe(25);
    expect(columnIndex("AA1")).toBe(26);
    expect(columnIndex("AB2")).toBe(27);
  });
});

describe("table rendering", () => {
  it("omits a header rule for a single row, which would claim it is a header", () => {
    expect(toMarkdownTable([["only"]])).toBe("| only |");
    expect(toMarkdownTable([["a"], ["b"]])).toContain("| --- |");
  });

  it("pads short rows so cells stay under their own column", () => {
    const table = toMarkdownTable([["a", "b", "c"], ["x"]]);
    expect(table).toContain("| x |  |  |");
  });
});

describe("OOXML identification", () => {
  it("identifies by content, because the extension is only a hint", () => {
    expect(detectOoxml({ "word/document.xml": 1 })).toBe("docx");
    expect(detectOoxml({ "xl/workbook.xml": 1 })).toBe("xlsx");
    expect(detectOoxml({ "ppt/presentation.xml": 1 })).toBe("pptx");
    expect(detectOoxml({ "mimetype": 1 })).toBeUndefined();
  });

  it("says which formats need the sidecar when handed a non-OOXML zip", async () => {
    const zip = zipSync({ "mimetype": strToU8("application/vnd.oasis.opendocument.text") });
    await expect(
      engine.convert({ kind: "buffer", data: zip, filename: "a.odt" }, sniff("office"), {}),
    ).rejects.toThrow(/OpenDocument, EPUB and Outlook formats need the MarkItDown sidecar/);
  });

  it("names the real problem for a pre-2007 binary Office file", async () => {
    // An OLE compound file is not a zip; "invalid zip" would send someone
    // hunting for a corrupt download instead of re-saving the file.
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
    await expect(
      engine.convert({ kind: "buffer", data: ole, filename: "old.doc" }, sniff("office"), {}),
    ).rejects.toThrow(/pre-2007 binary Office format/);
  });
});

describe("the escalation guard still sees flattened tables", () => {
  it("does not let line-rejoining hide table damage", () => {
    // The PDF reader rejoins wrapped prose lines. If it also joined table
    // rows, many flattened rows would collapse into one line and this check —
    // which counts lines — would go quiet exactly when it is needed.
    const flattened = "Cloud 4,812 1,204 3,977\nStorage 1,882 393 1,522\nTotal 7,873 1,956 7,091";
    expect(detectTableDegradation(flattened)).toBe(true);
  });
});

describe("routing agrees that these need no sidecar", () => {
  it("sniffs HTML as html so it reaches the in-process engine", () => {
    expect(sniffText("<html><body><p>x</p></body></html>", "a.html").kind).toBe("html");
  });
});
