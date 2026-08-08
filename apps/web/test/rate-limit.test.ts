import { beforeEach, describe, expect, it } from "vitest";
import { POST as compressPOST } from "../app/api/compress/route";
import { enforceRateLimit } from "../lib/guard";
import {
  RATE_LIMIT_EXPENSIVE,
  RATE_LIMIT_WINDOW_MS,
  clientKey,
  rateLimit,
  rateLimitHeaders,
  resetRateLimits,
} from "../lib/rate-limit";

/**
 * The limiter is the only guard that is per-caller rather than per-request, so
 * these cover the two ways it could fail silently: letting a caller past the
 * ceiling, and counting two different callers as one.
 */

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/convert", { method: "POST", headers });
}

beforeEach(() => {
  resetRateLimits();
});

describe("counting", () => {
  it("allows exactly the limit and refuses the next request", () => {
    for (let i = 1; i <= 5; i++) {
      expect(rateLimit("a", 5).ok, `request ${i} of 5 should pass`).toBe(true);
    }
    expect(rateLimit("a", 5).ok).toBe(false);
  });

  it("reports remaining budget, and never a negative one", () => {
    expect(rateLimit("a", 3).remaining).toBe(2);
    expect(rateLimit("a", 3).remaining).toBe(1);
    expect(rateLimit("a", 3).remaining).toBe(0);
    // Over the limit the count keeps rising; remaining must clamp at zero
    // rather than report a negative budget to a client.
    expect(rateLimit("a", 3).remaining).toBe(0);
  });

  it("keeps separate callers separate", () => {
    for (let i = 0; i < 5; i++) rateLimit("a", 5);
    expect(rateLimit("a", 5).ok).toBe(false);
    // b must be unaffected by a exhausting its budget.
    expect(rateLimit("b", 5).ok).toBe(true);
  });

  it("forgets a caller once the window has passed", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit("a", 3, 60_000, t0);
    expect(rateLimit("a", 3, 60_000, t0).ok).toBe(false);
    expect(rateLimit("a", 3, 60_000, t0 + 60_001).ok).toBe(true);
  });
});

describe("caller identity", () => {
  it("prefers platform headers over the forgeable one", () => {
    // x-forwarded-for is client-supplied. If it won, stripping or spoofing it
    // would be a free reset of your own budget.
    expect(clientKey(req({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "9.9.9.9" }))).toBe("1.1.1.1");
    expect(clientKey(req({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "9.9.9.9" }))).toBe("2.2.2.2");
  });

  it("takes the originating client from a forwarded chain", () => {
    expect(clientKey(req({ "x-forwarded-for": "3.3.3.3, 10.0.0.1, 10.0.0.2" }))).toBe("3.3.3.3");
  });

  it("does not exempt a caller it cannot identify", () => {
    const key = clientKey(req());
    expect(key).toBe("unknown");
    for (let i = 0; i < 5; i++) rateLimit(key, 5);
    expect(rateLimit(key, 5).ok).toBe(false);
  });
});

describe("memory is bounded", () => {
  it("keeps limiting after more callers than it will track", () => {
    // The map is itself an attack surface: one request per forged address
    // would grow it without bound. Past the cap, unidentified callers share an
    // overflow bucket — degraded fairness, but never fail-open and never
    // unbounded. 12k exceeds the 10k default cap.
    for (let i = 0; i < 12_000; i++) rateLimit(`ip-${i}`, 5);

    let refused = false;
    for (let i = 0; i < 200; i++) {
      if (!rateLimit(`flood-${i}`, 5).ok) {
        refused = true;
        break;
      }
    }
    expect(refused, "callers past the tracking cap must still hit a ceiling").toBe(true);
  });
});

describe("the response a client actually sees", () => {
  it("returns null while under the limit, so the handler proceeds", () => {
    expect(enforceRateLimit(req({ "x-real-ip": "5.5.5.5" }), 2)).toBeNull();
  });

  it("answers 429 with Retry-After and a way forward", async () => {
    const headers = { "x-real-ip": "6.6.6.6" };
    expect(enforceRateLimit(req(headers), 1)).toBeNull();

    const refused = enforceRateLimit(req(headers), 1);
    expect(refused).not.toBeNull();
    expect(refused?.status).toBe(429);

    // Retry-After is what a well-behaved client backs off on; without it the
    // only strategy available is to keep hammering.
    const retry = Number(refused?.headers.get("Retry-After"));
    expect(Number.isFinite(retry) && retry > 0).toBe(true);
    expect(retry).toBeLessThanOrEqual(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    expect(refused?.headers.get("RateLimit-Limit")).toBe("1");
    expect(refused?.headers.get("RateLimit-Remaining")).toBe("0");

    const body = (await refused?.json()) as { error: string };
    // Same contract as the size limits: say what to do next, not just no.
    expect(body.error).toMatch(/CLI/);
  });

  it("emits standard headers describing current standing", () => {
    expect(rateLimitHeaders(rateLimit("h", 10))).toMatchObject({
      "RateLimit-Limit": "10",
      "RateLimit-Remaining": "9",
    });
  });
});

describe("the real route enforces it", () => {
  it("refuses a flood on /api/compress with 429", async () => {
    // The unit tests above prove the limiter counts correctly; they would all
    // still pass if a route simply never called it. This asserts the wiring.
    const flood = (): Promise<Response> =>
      compressPOST(
        new Request("http://test/api/compress", {
          method: "POST",
          headers: { "content-type": "application/json", "x-real-ip": "7.7.7.7" },
          body: JSON.stringify({ text: "hello world", tokenBudget: 100 }),
        }),
      ) as unknown as Promise<Response>;

    let sawLimit = false;
    for (let i = 0; i < RATE_LIMIT_EXPENSIVE + 2; i++) {
      const res = await flood();
      if (res.status === 429) {
        sawLimit = true;
        expect(res.headers.get("Retry-After")).not.toBeNull();
        break;
      }
    }
    expect(sawLimit, "the route must stop serving past the limit").toBe(true);
  });
});
