import { describe, expect, it } from "vitest";
import { probePdf, probeText, sniffBuffer, sniffText } from "../src/router/sniffer.js";
import { FIXTURES_DIR, readFixture, syntheticScannedPdf, syntheticTextPdf } from "./helpers.js";
import { join } from "node:path";

describe("text sniffing on fixture inputs", () => {
  it("classifies the messy prompt as prompt (not csv, despite commas)", () => {
    const report = sniffText(readFixture(join(FIXTURES_DIR, "01-messy-prompt"), "input.txt"));
    expect(report.kind).toBe("prompt");
    expect(report.text?.looksLikeCsv).toBe(false);
  });

  it("classifies the email thread via header lines", () => {
    const report = sniffText(readFixture(join(FIXTURES_DIR, "02-meeting-email-thread"), "input.txt"));
    expect(report.kind).toBe("email");
    expect(report.text?.looksLikeEmail).toBe(true);
  });

  it("classifies the article as html by DOCTYPE and markup density", () => {
    const raw = readFixture(join(FIXTURES_DIR, "03-html-article"), "input.html");
    expect(sniffText(raw).kind).toBe("html");
    expect(probeText(raw).markupRatio).toBeGreaterThan(0.2);
  });

  it("classifies the inventory export as csv by uniform field counts", () => {
    const raw = readFixture(join(FIXTURES_DIR, "05-csv-inventory"), "input.csv");
    expect(sniffText(raw, "input.csv").kind).toBe("csv");
    expect(sniffText(raw).kind).toBe("csv"); // content alone suffices, no extension needed
  });

  it("classifies JSON without an extension", () => {
    expect(sniffText('{"a": [1, 2, 3]}').kind).toBe("json");
  });
});

describe("pdf probing", () => {
  it("flags image-only PDFs as scanned", () => {
    const probe = probePdf(syntheticScannedPdf());
    expect(probe.fontObjects).toBe(0);
    expect(probe.imageObjects).toBeGreaterThan(0);
    expect(probe.looksScanned).toBe(true);
    expect(probe.pageCount).toBe(1);
  });

  it("does not flag born-digital PDFs, and counts pages", () => {
    const probe = probePdf(syntheticTextPdf(3));
    expect(probe.looksScanned).toBe(false);
    expect(probe.fontObjects).toBeGreaterThan(0);
    expect(probe.pageCount).toBe(3);
  });

  it("sniffBuffer detects the pdf container by magic bytes", () => {
    const report = sniffBuffer(syntheticTextPdf(2), "report.pdf");
    expect(report.kind).toBe("pdf");
    expect(report.pdf?.pageCount).toBe(2);
  });
});

describe("binary container detection", () => {
  it("detects OOXML office files by ZIP magic + extension", () => {
    const zipMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    expect(sniffBuffer(zipMagic, "report.docx").kind).toBe("office");
  });

  it("returns unknown for undecodable binary", () => {
    const junk = Buffer.from([0x00, 0x01, 0xfe, 0xff, 0x03, 0x00, 0x9c]);
    expect(sniffBuffer(junk).kind).toBe("unknown");
  });
});
