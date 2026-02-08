'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/useLocale';

interface AuditEntry {
  id: number;
  userName: string;
  action: string;
  entityType: string;
  entityId: number;
  changes: string;
  timestamp: string;
}

export default function AuditPage() {
  const t = useT();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/audit?page=${page}`)
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">{t('auditLog')}</h1>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-gray-400 text-center py-12">No audit entries</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2">{t('timestamp')}</th>
                <th className="text-left p-2">{t('user')}</th>
                <th className="text-left p-2">{t('action')}</th>
                <th className="text-left p-2">{t('entity')}</th>
                <th className="text-left p-2">{t('changes')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="p-2">{entry.userName}</td>
                  <td className="p-2">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-xs">
                      {entry.action}
                    </span>
                  </td>
                  <td className="p-2 text-xs">
                    {entry.entityType} #{entry.entityId}
                  </td>
                  <td className="p-2">
                    <ChangesDisplay changes={entry.changes} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-3 py-1 rounded border text-sm disabled:opacity-30"
        >
          &larr;
        </button>
        <span className="text-sm text-gray-500">Page {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={entries.length < 50}
          className="px-3 py-1 rounded border text-sm disabled:opacity-30"
        >
          &rarr;
        </button>
      </div>
    </div>
  );
}

function ChangesDisplay({ changes }: { changes: string }) {
  try {
    const parsed = JSON.parse(changes);
    return (
      <div className="text-[10px] leading-relaxed max-w-xs">
        {Object.entries(parsed).map(([key, val]) => {
          const { old: oldVal, new: newVal } = val as { old: unknown; new: unknown };
          if (key === '_created') {
            return <div key={key} className="text-green-600">Created</div>;
          }
          if (key === '_deleted') {
            return <div key={key} className="text-red-600">Deleted</div>;
          }
          return (
            <div key={key}>
              <span className="font-medium">{key}:</span>{' '}
              <span className="text-red-500 line-through">{String(oldVal)}</span>{' '}
              <span className="text-green-600">{String(newVal)}</span>
            </div>
          );
        })}
      </div>
    );
  } catch {
    return <span className="text-[10px] text-gray-400">{changes}</span>;
  }
}
