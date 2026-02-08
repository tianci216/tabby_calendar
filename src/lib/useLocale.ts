'use client';

import { createContext, useContext, useCallback } from 'react';
import { t as translate, type Locale } from './i18n';

export const LocaleContext = createContext<Locale>('en');

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useContext(LocaleContext);
  return useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale]
  );
}
