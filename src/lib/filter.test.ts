import { describe, it, expect } from "vitest";
import { filterByTitleLength } from "./filter";
import { HNEntry } from "@/types";

function entry(overrides: Partial<HNEntry>): HNEntry {
  return {
    rank: 1,
    title: "Some Title",
    url: "https://example.com",
    score: 0,
    comments: 0,
    ...overrides,
  };
}

describe("filterByTitleLength", () => {
  const entries = [
    entry({ rank: 1, title: "One two three" }), // 3 words -> short
    entry({ rank: 2, title: "One two three four five six" }), // 6 words -> long
    entry({ rank: 3, title: "One two three four five" }), // 5 words -> short (boundary)
  ];

  it("returns all entries for 'all'", () => {
    expect(filterByTitleLength(entries, "all").map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("returns only titles with more than 5 words for 'long'", () => {
    expect(filterByTitleLength(entries, "long").map((e) => e.rank)).toEqual([2]);
  });

  it("returns only titles with 5 or fewer words for 'short'", () => {
    expect(filterByTitleLength(entries, "short").map((e) => e.rank)).toEqual([1, 3]);
  });

  it("handles titles with leading/trailing/multiple internal spaces correctly", () => {
    const messy = [entry({ rank: 4, title: "  One   two   three  " })];
    expect(filterByTitleLength(messy, "short").map((e) => e.rank)).toEqual([4]);
    expect(filterByTitleLength(messy, "long")).toEqual([]);
  });

  it("returns an empty array for empty input", () => {
    expect(filterByTitleLength([], "all")).toEqual([]);
  });
});
