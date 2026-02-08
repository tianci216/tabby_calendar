import { db } from '@/db';
import { users } from '@/db/schema';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { t, type Locale } from '@/lib/i18n';
import { UserManagement } from '@/components/admin/UserManagement';

export default async function UsersPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');
  if (user.role !== 'owner') redirect('/calendar');

  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value || 'en') as Locale;

  const allUsers = db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    role: users.role,
    icalToken: users.icalToken,
    createdAt: users.createdAt,
  }).from(users).all();

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">{t(locale, 'users')}</h1>
      <UserManagement users={allUsers} locale={locale} />
    </div>
  );
}
