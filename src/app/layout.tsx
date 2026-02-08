import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LocaleContext } from '@/lib/useLocale';
import type { Locale } from '@/lib/i18n';
import './globals.css';
import { LocaleProvider } from '@/components/layout/LocaleProvider';

export const metadata: Metadata = {
  title: 'Tabby Calendar',
  description: 'Dance studio calendar',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value || 'en') as Locale;

  return (
    <html lang={locale === 'zh' ? 'zh-CN' : 'en'}>
      <body className="bg-gray-50 min-h-screen">
        <LocaleProvider locale={locale}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
