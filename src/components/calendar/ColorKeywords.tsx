'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/useLocale';
import { PRESET_COLORS } from '@/lib/constants';

interface ColorKeyword {
  id: number;
  keyword: string;
  color: string;
  priority: number;
}

export function ColorKeywords() {
  const t = useT();
  const router = useRouter();
  const [keywords, setKeywords] = useState<ColorKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/color-keywords')
      .then((r) => r.json())
      .then(setKeywords)
      .catch(() => {});
  }, []);

  async function handleAdd() {
    if (!newKeyword.trim()) return;
    const res = await fetch('/api/color-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: newKeyword.trim(), color: newColor }),
    });
    if (res.ok) {
      const created = await res.json();
      setKeywords([created, ...keywords]);
      setNewKeyword('');
      router.refresh();
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/color-keywords/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setKeywords(keywords.filter((k) => k.id !== id));
      router.refresh();
    }
  }

  return (
    <div className="bg-white border rounded-lg p-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-700"
      >
        {t('colorLegend')}
        <span className="text-xs text-gray-400">{collapsed ? '+' : '-'}</span>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-2">
          {/* Existing keywords */}
          {keywords.map((kw) => (
            <div key={kw.id} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: kw.color }}
              />
              <span className="flex-1 truncate">{kw.keyword}</span>
              <button
                onClick={() => handleDelete(kw.id)}
                className="text-gray-400 hover:text-red-500 shrink-0"
              >
                &times;
              </button>
            </div>
          ))}

          {/* Add new keyword */}
          <div className="pt-2 border-t space-y-2">
            <div className="flex gap-1">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder={t('addKeyword')}
                className="flex-1 border rounded px-2 py-1 text-xs min-w-0"
              />
              <button
                onClick={handleAdd}
                disabled={!newKeyword.trim()}
                className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shrink-0"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-5 h-5 rounded-full border-2 ${
                    newColor === color ? 'border-gray-800' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
