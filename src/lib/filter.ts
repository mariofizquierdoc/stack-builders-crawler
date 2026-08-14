import { HNEntry } from "@/types";

export type TitleLengthFilter = "all" | "long" | "short";

export function filterByTitleLength(
  entries: HNEntry[],
  filter: TitleLengthFilter
): HNEntry[] {
  return entries.filter((e) => {
    const words = e.title.trim().split(/\s+/).length;
    if (filter === "long") return words > 5;
    if (filter === "short") return words <= 5;
    return true;
  });
}
