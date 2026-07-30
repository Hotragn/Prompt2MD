import { Builder, type WebDriver } from "selenium-webdriver";
import { Options as ChromeOptions } from "selenium-webdriver/chrome.js";
import { Options as EdgeOptions } from "selenium-webdriver/edge.js";

const HEADLESS_ARGS = ["--headless=new", "--window-size=1400,1000", "--disable-gpu"];

/**
 * Chrome first (CI runners), Microsoft Edge as the Windows-safe fallback.
 * Selenium Manager resolves matching driver binaries automatically.
 */
export async function createDriver(): Promise<WebDriver> {
  try {
    return await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(new ChromeOptions().addArguments(...HEADLESS_ARGS))
      .build();
  } catch {
    return new Builder()
      .forBrowser("MicrosoftEdge")
      .setEdgeOptions(new EdgeOptions().addArguments(...HEADLESS_ARGS))
      .build();
  }
}
