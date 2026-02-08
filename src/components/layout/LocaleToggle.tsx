'use client';

import { useLocale } from '@/lib/useLocale';

export function LocaleToggle() {
  const locale = useLocale();

  function toggle() {
    const next = locale === 'en' ? 'zh' : 'en';
    document.cookie = `locale=${next};path=/;max-age=${365 * 24 * 60 * 60}`;
    window.location.reload();
  }

  return (
    <button
      onClick={toggle}
      className="text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
    >
      {locale === 'en' ? '中文' : 'EN'}
    </button>
  );
}
