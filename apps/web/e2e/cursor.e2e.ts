import { By, until, type WebDriver } from "selenium-webdriver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDriver } from "./driver.js";
import { E2E_BASE_URL } from "./global-setup.js";

let driver: WebDriver;

describe("custom cursor never blocks real clicks (Selenium E2E)", () => {
  beforeAll(async () => {
    driver = await createDriver();
  });

  afterAll(async () => {
    await driver?.quit();
  });

  it("the tracking dot has pointer-events: none", async () => {
    await driver.get(E2E_BASE_URL);
    await driver.wait(until.elementLocated(By.css(".hero-title")), 30_000);
    const dot = await driver.findElement(By.css(".md-cursor-dot"));
    expect(await dot.getCssValue("pointer-events")).toBe("none");
  });

  it("a real mouse move-then-click on a button under the cursor still registers", async () => {
    // A plain element.click() does not reproduce this bug: it can resolve
    // without ever dispatching the pointermove that relocates the cursor's
    // tracking div over the target first. A real mouse always moves there
    // before it clicks — Actions().move(...).click() is what actually
    // exercises the failure mode (the tracking div sitting on top of the
    // button and swallowing the click meant for it).
    await driver.get(E2E_BASE_URL);
    await driver.wait(until.elementLocated(By.css(".hero-title")), 30_000);

    const button = await driver.findElement(By.xpath("//a[contains(text(),'Open the studio')]"));
    const rect = await button.getRect();

    await driver
      .actions({ async: true })
      .move({ x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) })
      .perform();
    await driver.sleep(200);
    await driver.actions({ async: true }).click().perform();

    await driver.wait(until.elementLocated(By.css(".tabs")), 10_000);
    expect(await driver.getCurrentUrl()).toContain("/studio");
  });
});
