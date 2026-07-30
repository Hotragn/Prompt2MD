import { By, until, type WebDriver } from "selenium-webdriver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDriver } from "./driver.js";
import { E2E_BASE_URL } from "./global-setup.js";

let driver: WebDriver;

describe("prompt2md landing page (Selenium E2E)", () => {
  beforeAll(async () => {
    driver = await createDriver();
    await driver.get(E2E_BASE_URL);
    await driver.wait(until.elementLocated(By.css(".hero-title")), 30_000);
  });

  afterAll(async () => {
    await driver?.quit();
  });

  it("renders the hero fully visible — content never waits on scroll", async () => {
    const wrapper = await driver.findElement(By.css(".hero .reveal"));
    await driver.wait(async () => (await wrapper.getCssValue("opacity")) === "1", 10_000);

    const title = await driver.findElement(By.css(".hero-title"));
    expect((await title.getText()).toLowerCase()).toContain("token-optimized markdown");
  });

  it("reveals every above-the-fold section without requiring interaction", async () => {
    const shown = await driver.executeScript<number>(
      `return [...document.querySelectorAll('.hero .reveal')].filter(r => r.dataset.shown === 'true').length`,
    );
    expect(shown).toBeGreaterThan(0);
  });

  it("keeps content readable when scroll-reveal never runs (no-JS safety)", async () => {
    // Strip the bootstrap class the inline script adds; the hidden starting
    // state must be scoped to it, so text stays visible without JS.
    const opacity = await driver.executeScript<string>(
      `document.documentElement.classList.remove('js');
       const el = document.querySelector('.section .reveal');
       el.dataset.shown = 'false';
       return getComputedStyle(el).opacity;`,
    );
    expect(opacity).toBe("1");
    await driver.executeScript(`document.documentElement.classList.add('js')`);
  });

  it("folds real text through the live API in the hero", async () => {
    const button = await driver.findElement(By.css(".fold-actions .btn"));
    await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", button);
    // A sticky masthead can intercept a native click on a slow CI machine, and
    // the failure ("element click intercepted") looks like a product bug. Drive
    // it directly — this test is about the pipeline, not hit-testing.
    await driver.executeScript("arguments[0].click()", button);

    const ledger = await driver.wait(until.elementLocated(By.css(".ledger")), 60_000);
    const text = await ledger.getText();

    // before → after → % of original, all from a real pipeline run
    const numbers = text.match(/\d[\d,]*/g) ?? [];
    expect(numbers.length).toBeGreaterThanOrEqual(3);

    const before = Number(numbers[0]!.replace(/,/g, ""));
    const after = Number(numbers[1]!.replace(/,/g, ""));
    expect(before).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
  });

  it("navigates from the masthead into the studio", async () => {
    const cta = await driver.findElement(By.css(".nav-cta"));
    await cta.click();
    await driver.wait(until.elementLocated(By.css(".tabs")), 30_000);
    expect(await driver.getCurrentUrl()).toContain("/studio");
  });
});
