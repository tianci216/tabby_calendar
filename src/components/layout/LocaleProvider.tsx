'use client';

import { LocaleContext } from '@/lib/useLocale';
import type { Locale } from '@/lib/i18n';

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <LocaleContext.Provider value={locale}>
      {children}
    </LocaleContext.Provider>
  );
}
