import { parseHNEntries, HN_BASE } from "@/lib/parseHNEntries";

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
    const entries = parseHNEntries(html);

    return Response.json(entries);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
