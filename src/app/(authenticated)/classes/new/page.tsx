import { db } from '@/db';
import { users } from '@/db/schema';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { t, type Locale } from '@/lib/i18n';
import { ClassForm } from '@/components/forms/ClassForm';

export default async function NewClassPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value || 'en') as Locale;

  const teachers = db.select({
    id: users.id,
    displayName: users.displayName,
  }).from(users).all();

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">{t(locale, 'addClass')}</h1>
      <ClassForm teachers={teachers} />
    </div>
  );
}
