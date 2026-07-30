import { describe, expect, it } from "vitest";
import { POST } from "../app/api/convert/route";

interface ConvertResponse {
  markdown?: string;
  report?: { engine: string; outputTokens: number };
  warnings?: { code: string }[];
  error?: string;
}

describe("/api/convert route handler", () => {
  it("converts JSON text bodies", async () => {
    const res = await POST(
      new Request("http://test/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "please clean this up, use pandas, also use pandas" }),
      }),
    );
    const body = (await res.json()) as ConvertResponse;

    expect(res.status).toBe(200);
    expect(body.markdown).toBeTruthy();
    expect(body.report?.engine).toBeTruthy();
  });

  it("converts multipart file uploads (server-side binary path)", async () => {
    const form = new FormData();
    form.set(
      "file",
      new File(["sku,name,qty\nKB-1,Keyboard,42\nMS-2,Mouse,17"], "inventory.csv", { type: "text/csv" }),
    );
    const res = await POST(new Request("http://test/api/convert", { method: "POST", body: form }));
    const body = (await res.json()) as ConvertResponse;

    // With markitdown installed: real fast-path conversion. Without: the
    // text-path fallback with an engine-error warning. Both are 200 + content.
    expect(res.status).toBe(200);
    expect(body.markdown).toContain("KB-1");
    expect(body.report?.engine).toBeTruthy();
  }, 120_000);

  it("rejects multipart without a file field", async () => {
    const form = new FormData();
    form.set("tokenBudget", "500");
    const res = await POST(new Request("http://test/api/convert", { method: "POST", body: form }));
    expect(res.status).toBe(400);
  });

  it("rejects empty JSON text", async () => {
    const res = await POST(
      new Request("http://test/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "  " }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
