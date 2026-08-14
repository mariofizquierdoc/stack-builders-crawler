import * as cheerio from "cheerio";
import { HNEntry } from "@/types";

export const HN_BASE = "https://news.ycombinator.com";

export function parseHNEntries(html: string): HNEntry[] {
  const $ = cheerio.load(html);
  const entries: HNEntry[] = [];

  $("tr.athing").slice(0, 30).each((_i, el) => {
    const row = $(el);
    const subRow = row.next("tr");

    const rankText = row.find(".rank").text().trim();
    const rank = parseInt(rankText.replace(".", ""), 10);

    const titleAnchor = row.find(".titleline > a").first();
    const title = titleAnchor.text().trim();

    const rawUrl = titleAnchor.attr("href") ?? "";
    const url = rawUrl.startsWith("item?id=")
      ? `${HN_BASE}/${rawUrl}`
      : /^https?:\/\//i.test(rawUrl)
        ? rawUrl
        : "";

    const scoreText = subRow.find(".score").text();
    const score = parseInt(scoreText, 10) || 0;

    const commentsAnchor = subRow.find(`a[href^="item?id="]`).last();
    const commentsText = commentsAnchor.text().trim();
    const comments =
      commentsText === "discuss" || commentsText === ""
        ? 0
        : parseInt(commentsText, 10) || 0;

    if (title) {
      entries.push({ rank, title, url, score, comments });
    }
  });

  return entries;
}
