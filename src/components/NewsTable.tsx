import { HNEntry } from "@/types";

type SortKey = "score" | "comments";
type SortDir = "asc" | "desc";

interface Props {
  entries: HNEntry[];
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

function SortableHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th className="px-4 py-3 w-24 text-right">
      <button
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center justify-end gap-1 w-full hover:text-orange-200 transition-colors cursor-pointer"
      >
        {label}
        <span className="text-sm w-3 text-center">
          {active ? (dir === "desc" ? "↓" : "↑") : "↕"}
        </span>
      </button>
    </th>
  );
}

export default function NewsTable({ entries, sortKey, sortDir, onSort }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-orange-500 text-white uppercase text-xs">
          <tr>
            <th className="px-4 py-3 w-12">#</th>
            <th className="px-4 py-3">Title</th>
            <SortableHeader
              label="Score"
              sortKey="score"
              active={sortKey === "score"}
              dir={sortDir}
              onSort={onSort}
            />
            <SortableHeader
              label="Comments"
              sortKey="comments"
              active={sortKey === "comments"}
              dir={sortDir}
              onSort={onSort}
            />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr
              key={entry.rank}
              className={`border-t border-gray-100 hover:bg-orange-50 transition-colors ${
                idx % 2 === 0 ? "bg-white" : "bg-gray-50"
              }`}
            >
              <td className="px-4 py-3 text-gray-400 font-mono">{entry.rank}</td>
              <td className="px-4 py-3">
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-900 hover:underline font-medium"
                >
                  {entry.title}
                </a>
              </td>
              <td className="px-4 py-3 text-right text-gray-700 font-mono">
                {entry.score}
              </td>
              <td className="px-4 py-3 text-right text-gray-700 font-mono">
                {entry.comments}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
