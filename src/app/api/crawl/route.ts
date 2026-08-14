import * as cheerio from "cheerio";
import { HNEntry } from "@/types";

const HN_BASE = "https://news.ycombinator.com";

export async function GET() {
  try {
    const res = await fetch(HN_BASE + "/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HN-Crawler/1.0)" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return Response.json(
        { error: `HN fetch failed: ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();
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
        : rawUrl;

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

    return Response.json(entries);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
