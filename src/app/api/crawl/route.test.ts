import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { GET } from "./route";

const sampleHtml = fs.readFileSync(
  path.join(__dirname, "../../../lib/__fixtures__/hn-sample.html"),
  "utf-8"
);

describe("GET /api/crawl", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed entries on success", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => sampleHtml,
    } as Response);

    const res = await GET();
    expect(res.status).toBe(200);

    const entries = await res.json();
    expect(entries).toHaveLength(4);
    expect(entries[0]).toEqual({
      rank: 1,
      title: "First Story Title Here",
      url: "https://example.com/first",
      score: 120,
      comments: 85,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://news.ycombinator.com/",
      expect.objectContaining({
        headers: expect.objectContaining({ "User-Agent": expect.any(String) }),
      })
    );
  });

  it("returns a 502 when the upstream response is not ok", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    const res = await GET();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "HN fetch failed: 503" });
  });

  it("returns a 500 when fetch throws", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network down")
    );

    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "network down" });
  });
});
