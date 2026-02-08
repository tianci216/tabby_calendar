import Link from 'next/link';
import { db } from '@/db';
import { classes, classTeachers, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { t, type Locale } from '@/lib/i18n';

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  const colors: Record<string, string> = {
    planned: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100'}`}>
      {t(locale, status)}
    </span>
  );
}

export default async function ClassesPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value || 'en') as Locale;

  const allClasses = db.select().from(classes).all();

  const classesWithTeachers = allClasses.map((cls) => {
    const teachers = db
      .select({
        id: users.id,
        displayName: users.displayName,
        role: classTeachers.role,
      })
      .from(classTeachers)
      .innerJoin(users, eq(classTeachers.teacherId, users.id))
      .where(eq(classTeachers.classId, cls.id))
      .all();
    return { ...cls, teachers };
  });

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{t(locale, 'classes')}</h1>
        <Link
          href="/classes/new"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + {t(locale, 'addClass')}
        </Link>
      </div>

      {classesWithTeachers.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t(locale, 'noLessons')}</p>
      ) : (
        <div className="space-y-3">
          {classesWithTeachers.map((cls) => (
            <Link
              key={cls.id}
              href={`/classes/${cls.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cls.color || '#4A90D9' }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{cls.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {cls.teachers.map((teacher) => teacher.displayName).join(' & ')}
                      <span className="mx-2">|</span>
                      {cls.totalLessons} {t(locale, 'lessons').toLowerCase()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {cls.room === 'rendez_vous' ? t(locale, 'rendezVous') : t(locale, 'palomar')}
                  </span>
                  <StatusBadge status={cls.status} locale={locale} />
                  <span className="text-sm text-gray-500">
                    {cls.studentCount} {t(locale, 'students').toLowerCase()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
