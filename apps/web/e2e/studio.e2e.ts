import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { By, until, type WebDriver } from "selenium-webdriver";
import { createDriver } from "./driver.js";
import { E2E_BASE_URL } from "./global-setup.js";

let driver: WebDriver;

async function clickButtonByText(text: string, cssScope: string): Promise<void> {
  const button = await driver.findElement(
    By.xpath(`//button[contains(@class, "${cssScope}") and normalize-space(text())="${text}"]`),
  );
  await button.click();
}

async function outputText(): Promise<string> {
  const output = await driver.wait(until.elementLocated(By.css("pre.output")), 60_000);
  await driver.wait(async () => (await output.getText()).trim().length > 0, 60_000);
  return output.getText();
}

describe("prompt2md studio (Selenium E2E)", () => {
  beforeAll(async () => {
    driver = await createDriver();
    await driver.get(E2E_BASE_URL);
    await driver.wait(until.elementLocated(By.css(".brand")), 30_000);
  });

  afterAll(async () => {
    await driver?.quit();
  });

  it("loads with the brand, tagline, and a decodable icon", async () => {
    expect(await driver.getTitle()).toContain("A Markdown Magic");
    expect(await driver.findElement(By.css(".brand")).getText()).toContain("prompt2md");
    // Selenium returns rendered text; the tagline is uppercased by CSS.
    expect((await driver.findElement(By.css(".tagline")).getText()).toLowerCase()).toBe(
      "a markdown magic",
    );
    const iconOk = await driver.executeScript<boolean>(
      "const i = document.querySelector('img.mark'); return !!i && i.complete && i.naturalWidth > 0;",
    );
    expect(iconOk).toBe(true);
  });

  it("converts the sample prompt and shows an honest token report", async () => {
    await clickButtonByText("Load sample", "ghost");
    await clickButtonByText("Convert", "btn");

    const markdown = await outputText();
    expect(markdown.length).toBeGreaterThan(50);

    const stats = await driver.findElement(By.css(".stats")).getText();
    expect(stats).toMatch(/INPUT TOKENS/i);
    expect(stats).toMatch(/OUTPUT TOKENS/i);
    expect(stats).toMatch(/ENGINE/i);
  });

  it("compresses to a budget with lossless anchors and savings stats", async () => {
    await clickButtonByText("Compress", "tab");
    await clickButtonByText("Load sample", "ghost");
    const budget = await driver.findElement(By.css('input[type="number"]'));
    await budget.clear();
    await budget.sendKeys("400");
    await clickButtonByText("Compress", "btn");

    const markdown = await outputText();
    expect(markdown).toContain("p2md:src=");
    expect(markdown).toContain("p2md:cache-breakpoint");
    // head and tail survive verbatim (lost-in-the-middle mitigation)
    expect(markdown).toContain("Incident 4417");
    expect(markdown).toContain("Resolution: root cause was a stale feature flag");

    const stats = await driver.findElement(By.css(".stats")).getText();
    expect(stats).toMatch(/REPEAT-CALL COST/i);
    expect(await driver.getPageSource()).toContain("original stored");
  });

  it("retrieves the byte-exact original behind an anchor (nothing is lost)", async () => {
    const markdown = await outputText();
    const anchor = /p2md:src=[0-9a-f]{16}#\d+-\d+/.exec(markdown)?.[0];
    expect(anchor).toBeDefined();

    const retrieved = await driver.executeAsyncScript<{ status: number; text: string }>(
      `const [ref, done] = [arguments[0], arguments[arguments.length - 1]];
       fetch("/api/retrieve?ref=" + encodeURIComponent(ref))
         .then(r => r.json().then(j => done({ status: r.status, text: j.text || "" })))
         .catch(() => done({ status: 0, text: "" }));`,
      anchor,
    );

    expect(retrieved.status).toBe(200);
    expect(retrieved.text.length).toBeGreaterThan(100);
    expect(retrieved.text).toContain("Extended narrative");
    // The verbatim original is longer than its summary in the compressed doc.
    expect(markdown).not.toContain(retrieved.text);
  });

  it("renders the markdown preview toggle after converting", async () => {
    await clickButtonByText("Convert", "tab");
    await clickButtonByText("Load sample", "ghost");
    await clickButtonByText("Convert", "btn");
    await outputText();

    await clickButtonByText("Preview", "chip");
    const prose = await driver.wait(until.elementLocated(By.css(".output.prose")), 15_000);
    const hasStructure = await prose.findElements(By.css("h1, h2, p, ul"));
    expect(hasStructure.length).toBeGreaterThan(0);
    await clickButtonByText("Raw", "chip");
    await driver.wait(until.elementLocated(By.css("pre.output")), 15_000);
  });

  it("offers file upload on the input card", async () => {
    const uploadButtons = await driver.findElements(
      By.xpath('//button[contains(@class, "ghost") and normalize-space(text())="Upload file"]'),
    );
    expect(uploadButtons.length).toBe(1);
    const fileInputs = await driver.findElements(By.css('input[type="file"]'));
    expect(fileInputs.length).toBe(1);
  });

  it("daily digest tab loads live sources or degrades to a readable error", async () => {
    await clickButtonByText("Daily Digest", "tab");
    // Live network call: either the digest body or a friendly error must appear.
    const outcome = await driver.wait(async () => {
      const bodies = await driver.findElements(By.css(".digest-body"));
      if (bodies.length > 0) return "digest";
      const errors = await driver.findElements(By.css(".digest .error"));
      if (errors.length > 0) return "error";
      return null;
    }, 60_000);

    if (outcome === "digest") {
      const stats = await driver.findElement(By.css(".digest .stats")).getText();
      expect(stats).toMatch(/RAW SOURCE PAYLOADS/i);
      expect(stats).toMatch(/THIS DIGEST/i);
      expect(await driver.getPageSource()).toContain("stored losslessly");
    } else {
      const message = await driver.findElement(By.css(".digest .error")).getText();
      expect(message.length).toBeGreaterThan(10); // readable, not a blank crash
    }
  });

  it("keeps working via API when the input routes to a missing sidecar (graceful degradation)", async () => {
    const res = await driver.executeAsyncScript<{ status: number; engine: string; warnings: string[] }>(
      `const done = arguments[arguments.length - 1];
       fetch("/api/convert", {
         method: "POST",
         headers: { "content-type": "application/json" },
         body: JSON.stringify({ text: "sku,name,qty\\nKB-1,Keyboard,42\\nMS-2,Mouse,17\\nHS-3,Headset,9" })
       }).then(r => r.json().then(j => done({
         status: r.status,
         engine: j.report ? j.report.engine : "",
         warnings: (j.warnings || []).map(w => w.code)
       }))).catch(() => done({ status: 0, engine: "", warnings: [] }));`,
    );

    expect(res.status).toBe(200);
    expect(res.engine.length).toBeGreaterThan(0);
    // With sidecars installed this is markitdown with no warnings; without,
    // the text-path fallback with an engine-error warning. Both are correct.
    if (res.engine !== "markitdown") {
      expect(res.warnings).toContain("engine-error");
    }
  });
});
