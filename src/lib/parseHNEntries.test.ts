import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseHNEntries, HN_BASE } from "./parseHNEntries";

const sampleHtml = fs.readFileSync(
  path.join(__dirname, "__fixtures__/hn-sample.html"),
  "utf-8"
);

describe("parseHNEntries", () => {
  it("skips rows with an empty title", () => {
    const entries = parseHNEntries(sampleHtml);
    expect(entries).toHaveLength(4);
    expect(entries.some((e) => e.rank === 4)).toBe(false);
  });

  it("strips non-http(s) URL schemes instead of passing them through", () => {
    const entries = parseHNEntries(sampleHtml);
    const fifth = entries.find((e) => e.rank === 5)!;
    expect(fifth.title).toBe("Malicious Link Story");
    expect(fifth.url).toBe("");
  });

  it("parses a normal story with external URL, score, and comments", () => {
    const [first] = parseHNEntries(sampleHtml);
    expect(first).toEqual({
      rank: 1,
      title: "First Story Title Here",
      url: "https://example.com/first",
      score: 120,
      comments: 85,
    });
  });

  it("rewrites internal item links and treats 'discuss' as zero comments", () => {
    const entries = parseHNEntries(sampleHtml);
    const second = entries.find((e) => e.rank === 2)!;
    expect(second.url).toBe(`${HN_BASE}/item?id=2`);
    expect(second.comments).toBe(0);
  });

  it("defaults score and comments to zero when missing", () => {
    const entries = parseHNEntries(sampleHtml);
    const third = entries.find((e) => e.rank === 3)!;
    expect(third.score).toBe(0);
    expect(third.comments).toBe(0);
  });
});
