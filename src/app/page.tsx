"use client";

import { useState } from "react";
import NewsTable from "@/components/NewsTable";
import { HNEntry } from "@/types";

type SortKey = "score" | "comments";
type SortDir = "asc" | "desc";

function sortEntries(entries: HNEntry[], key: SortKey | null, dir: SortDir) {
  if (!key) return entries;
  return [...entries].sort((a, b) => {
    const diff = a[key] - b[key];
    return dir === "asc" ? diff : -diff;
  });
}

export default function Home() {
  const [entries, setEntries] = useState<HNEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<'all' | 'long' | 'short'>('all');

  async function handleCrawl() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crawl");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data: HNEntry[] = await res.json();
      setEntries(data);
      setSortKey(null);
      setFilter('all');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to crawl");
    } finally {
      setLoading(false);
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = sortEntries(entries, sortKey, sortDir);
  const filtered = sorted.filter((e) => {
    const words = e.title.trim().split(/\s+/).length;
    if (filter === 'long') return words > 5;
    if (filter === 'short') return words <= 5;
    return true;
  });

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">HN Crawler</h1>
      <p className="text-gray-500 mb-6">
        Fetch the top 30 stories from Hacker News on demand.
      </p>

      <div className="mb-6">
        <button
          onClick={handleCrawl}
          disabled={loading}
          className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? "Crawling…" : "Crawl Hacker News"}
        </button>
      </div>

      {entries.length > 0 && (
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm text-gray-500 font-medium">Filter by title length:</span>
          {(['all', 'long', 'short'] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
              <input
                type="radio"
                name="filter"
                value={opt}
                checked={filter === opt}
                onChange={() => setFilter(opt)}
                className="accent-orange-500"
              />
              {opt === 'all' ? 'All' : opt === 'long' ? '> 5 words' : '≤ 5 words'}
            </label>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          Error: {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-gray-500 py-10 justify-center">
          <svg
            className="animate-spin h-6 w-6 text-orange-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Fetching stories…
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <NewsTable
          entries={filtered}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )}

      {!loading && entries.length === 0 && !error && (
        <p className="text-center text-gray-400 py-16">
          Click &ldquo;Crawl Hacker News&rdquo; to load stories.
        </p>
      )}
    </main>
  );
}
