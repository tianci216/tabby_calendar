'use client';

import { useRouter } from 'next/navigation';
import { t, type Locale } from '@/lib/i18n';

export function DeleteClassButton({ classId, className, locale }: { classId: number; className: string; locale: Locale }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`${t(locale, 'delete')} "${className}"?`)) return;
    const res = await fetch(`/api/classes/${classId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/classes');
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-sm px-3 py-1.5 rounded border border-red-300 text-red-600 hover:bg-red-50"
    >
      {t(locale, 'delete')}
    </button>
  );
}
