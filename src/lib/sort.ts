import { HNEntry } from "@/types";

export type SortKey = "score" | "comments";
export type SortDir = "asc" | "desc";

export function sortEntries(
  entries: HNEntry[],
  key: SortKey | null,
  dir: SortDir
): HNEntry[] {
  if (!key) return entries;
  return [...entries].sort((a, b) => {
    const diff = a[key] - b[key];
    return dir === "asc" ? diff : -diff;
  });
}
