import { HNEntry } from "@/types";

interface Props {
  entries: HNEntry[];
}

export default function NewsTable({ entries }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-orange-500 text-white uppercase text-xs">
          <tr>
            <th className="px-4 py-3 w-12">#</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3 w-24 text-right">Score</th>
            <th className="px-4 py-3 w-28 text-right">Comments</th>
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
