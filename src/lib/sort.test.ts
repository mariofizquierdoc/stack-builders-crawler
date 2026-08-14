import { describe, it, expect } from "vitest";
import { sortEntries } from "./sort";
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

describe("sortEntries", () => {
  const entries = [
    entry({ rank: 1, score: 10, comments: 5 }),
    entry({ rank: 2, score: 30, comments: 1 }),
    entry({ rank: 3, score: 20, comments: 9 }),
  ];

  it("returns entries in original order when key is null", () => {
    const result = sortEntries(entries, null, "desc");
    expect(result.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("sorts by score descending", () => {
    const result = sortEntries(entries, "score", "desc");
    expect(result.map((e) => e.rank)).toEqual([2, 3, 1]);
  });

  it("sorts by score ascending", () => {
    const result = sortEntries(entries, "score", "asc");
    expect(result.map((e) => e.rank)).toEqual([1, 3, 2]);
  });

  it("sorts by comments descending", () => {
    const result = sortEntries(entries, "comments", "desc");
    expect(result.map((e) => e.rank)).toEqual([3, 1, 2]);
  });

  it("sorts by comments ascending", () => {
    const result = sortEntries(entries, "comments", "asc");
    expect(result.map((e) => e.rank)).toEqual([2, 1, 3]);
  });

  it("does not mutate the input array", () => {
    const original = [...entries];
    sortEntries(entries, "score", "desc");
    expect(entries.map((e) => e.rank)).toEqual(original.map((e) => e.rank));
  });

  it("returns an empty array for empty input", () => {
    expect(sortEntries([], "score", "desc")).toEqual([]);
  });
});
