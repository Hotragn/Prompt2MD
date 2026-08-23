import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as convertPOST } from "../app/api/convert/route";
import { GET as capabilitiesGET } from "../app/api/capabilities/route";
import { RATE_LIMIT_EXPENSIVE, resetRateLimits } from "../lib/rate-limit";

/**
 * Guards the class of bug, not one instance of it.
 *
 * /api/convert imported `enforceRateLimit` and never called it: the most
 * expensive route in the app — 25MB uploads, the full pipeline, a 45s deadline
 * — served unlimited requests while /api/capabilities told clients it was
 * capped at 20/min. Every sibling route called the guard, so nothing looked
 * wrong in review, and the one wiring test that existed asserted the wiring on
 * /api/compress only.
 *
 * A per-route test would have missed it the same way. These read the source of
 * every route instead, so a route added next year is covered on the day it
 * lands.
 */

const API_DIR = join(process.cwd(), "app/api");

/** Routes whose work can occupy a function for the full request deadline. */
const EXPENSIVE = new Set(["convert", "compress"]);

async function routeSources(): Promise<{ name: string; source: string }[]> {
  const entries = await readdir(API_DIR, { withFileTypes: true });
  return Promise.all(
    entries
      .filter((e) => e.isDirectory())
      .map(async (e) => ({
        name: e.name,
        source: await readFile(join(API_DIR, e.name, "route.ts"), "utf8"),
      })),
  );
}

beforeEach(() => {
  resetRateLimits();
});

describe("every API route enforces a rate limit", () => {
  it("finds routes to check (guards against an empty-scan false pass)", async () => {
    const routes = await routeSources();
    expect(routes.length).toBeGreaterThanOrEqual(5);
    expect(routes.map((r) => r.name)).toContain("convert");
  });

  it("calls enforceRateLimit, not merely imports it", async () => {
    for (const { name, source } of await routeSources()) {
      expect(source, `/api/${name} must call enforceRateLimit(req, ...)`).toMatch(
        /enforceRateLimit\(\s*req/,
      );
    }
  });

  it("prices expensive routes with the expensive budget", async () => {
    for (const { name, source } of await routeSources()) {
      if (!EXPENSIVE.has(name)) continue;
      expect(source, `/api/${name} must use RATE_LIMIT_EXPENSIVE`).toMatch(
        /enforceRateLimit\(\s*req,\s*RATE_LIMIT_EXPENSIVE\s*\)/,
      );
    }
  });

});

describe("the limit is applied before the body is read", () => {
  // Source-position checks are brittle here (helpers defined above the handler
  // read the body earlier in the file than the guard is called). Assert the
  // behaviour instead: once the budget is spent, a request with a body that
  // would otherwise 400 must still come back 429. A 400 would prove the body
  // was parsed first, which is the expensive work the guard exists to skip.
  it("returns 429, not 400, for malformed input once the budget is spent", async () => {
    const send = (body: string): Promise<Response> =>
      convertPOST(
        new Request("http://test/api/convert", {
          method: "POST",
          headers: { "content-type": "application/json", "x-real-ip": "9.9.9.11" },
          body,
        }),
      ) as unknown as Promise<Response>;

    for (let i = 0; i < RATE_LIMIT_EXPENSIVE; i++) {
      await send(JSON.stringify({ text: "ok" }));
    }
    expect((await send("{ not json")).status).toBe(429);
  }, 30_000);
});

describe("/api/convert actually refuses a flood", () => {
  it("returns 429 with Retry-After past the limit", async () => {
    const flood = (): Promise<Response> =>
      convertPOST(
        new Request("http://test/api/convert", {
          method: "POST",
          headers: { "content-type": "application/json", "x-real-ip": "9.9.9.9" },
          body: JSON.stringify({ text: "hello world" }),
        }),
      ) as unknown as Promise<Response>;

    let sawLimit = false;
    for (let i = 0; i < RATE_LIMIT_EXPENSIVE + 2; i++) {
      const res = await flood();
      if (res.status === 429) {
        sawLimit = true;
        expect(res.headers.get("Retry-After")).not.toBeNull();
        expect(res.headers.get("RateLimit-Limit")).toBe(String(RATE_LIMIT_EXPENSIVE));
        break;
      }
    }
    expect(sawLimit, "the route must stop serving past the limit").toBe(true);
    // Each iteration is a real conversion through the pipeline, so the default
    // 5s budget is too tight to be reliable on a cold or loaded runner.
  }, 30_000);

  it("counts multipart uploads too, before reading the file", async () => {
    const upload = (): Promise<Response> => {
      const form = new FormData();
      form.set("file", new File(["a,b\n1,2"], "t.csv", { type: "text/csv" }));
      return convertPOST(
        new Request("http://test/api/convert", {
          method: "POST",
          headers: { "x-real-ip": "9.9.9.10" },
          body: form,
        }),
      ) as unknown as Promise<Response>;
    };

    let sawLimit = false;
    for (let i = 0; i < RATE_LIMIT_EXPENSIVE + 2; i++) {
      if ((await upload()).status === 429) {
        sawLimit = true;
        break;
      }
    }
    expect(sawLimit).toBe(true);
  }, 30_000);
});

describe("capabilities does not advertise a limit nothing enforces", () => {
  it("only reports a convert/compress ceiling that both routes apply", async () => {
    const res = await capabilitiesGET(new Request("http://test/api/capabilities"));
    const caps = (await res.json()) as {
      limits: { rateLimit: { convertOrCompressPerWindow: number } };
    };

    if (caps.limits.rateLimit.convertOrCompressPerWindow > 0) {
      for (const name of EXPENSIVE) {
        const source = await readFile(join(API_DIR, name, "route.ts"), "utf8");
        expect(source, `/api/capabilities promises a limit /api/${name} must enforce`).toMatch(
          /enforceRateLimit\(\s*req,\s*RATE_LIMIT_EXPENSIVE\s*\)/,
        );
      }
    }
  });
});
