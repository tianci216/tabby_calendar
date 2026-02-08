import en from '../../public/locales/en.json';
import zh from '../../public/locales/zh.json';

const translations: Record<string, Record<string, string>> = { en, zh };
export type Locale = 'en' | 'zh';

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let text = translations[locale]?.[key] || translations['en']?.[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
