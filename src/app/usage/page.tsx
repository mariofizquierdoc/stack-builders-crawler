import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const FILTER_OPTIONS = ["all", "long", "short"] as const;
const FILTER_LABELS: Record<(typeof FILTER_OPTIONS)[number], string> = {
  all: "All",
  long: "> 5 words",
  short: "≤ 5 words",
};

const SORT_KEY_OPTIONS = ["score", "comments", null] as const;
const SORT_KEY_LABELS: Record<string, string> = {
  score: "Score",
  comments: "Comments",
  none: "Not sorted",
};

export default async function UsagePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const [filterCounts, sortKeyCounts, events] = await Promise.all([
    prisma.usageEvent.groupBy({
      by: ["filter"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.usageEvent.groupBy({
      by: ["sortKey"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.usageEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const filterCountMap = new Map(filterCounts.map((f) => [f.filter, f._count._all]));
  const sortKeyCountMap = new Map(sortKeyCounts.map((s) => [s.sortKey, s._count._all]));

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/" className="text-orange-600 hover:underline text-sm">
        ← Back to crawler
      </Link>

      <h1 className="text-3xl font-bold text-gray-800 mt-2 mb-6">Your usage</h1>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            Filter usage
          </h2>
          <ul className="text-sm text-gray-700 space-y-1">
            {FILTER_OPTIONS.map((opt) => (
              <li key={opt} className="flex justify-between">
                <span>{FILTER_LABELS[opt]}</span>
                <span className="font-mono">{filterCountMap.get(opt) ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            Sort usage
          </h2>
          <ul className="text-sm text-gray-700 space-y-1">
            {SORT_KEY_OPTIONS.map((opt) => (
              <li key={opt ?? "none"} className="flex justify-between">
                <span>{SORT_KEY_LABELS[opt ?? "none"]}</span>
                <span className="font-mono">{sortKeyCountMap.get(opt) ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-center text-gray-400 py-16">
          No usage recorded yet. Crawl and try the filter/sort controls to see activity here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-orange-500 text-white uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Filter</th>
                <th className="px-4 py-3">Sort key</th>
                <th className="px-4 py-3">Sort direction</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, idx) => (
                <tr
                  key={event.id}
                  className={`border-t border-gray-100 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3 text-gray-700 font-mono">
                    {event.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {FILTER_LABELS[event.filter]}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {event.sortKey ? SORT_KEY_LABELS[event.sortKey] : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{event.sortDir}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
