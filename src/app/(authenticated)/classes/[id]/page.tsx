import { db } from '@/db';
import { classes, classTeachers, lessons, users, lessonTeacherOverrides } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { t, type Locale } from '@/lib/i18n';
import { ClassForm } from '@/components/forms/ClassForm';
import { LessonList } from '@/components/LessonList';

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const classId = parseInt(id);
  const cls = db.select().from(classes).where(eq(classes.id, classId)).get();
  if (!cls) notFound();

  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value || 'en') as Locale;

  const teachers = db.select({
    id: users.id,
    displayName: users.displayName,
  }).from(users).all();

  const classTeacherList = db
    .select({
      id: users.id,
      displayName: users.displayName,
      role: classTeachers.role,
    })
    .from(classTeachers)
    .innerJoin(users, eq(classTeachers.teacherId, users.id))
    .where(eq(classTeachers.classId, classId))
    .all();

  const classLessons = db.select().from(lessons)
    .where(eq(lessons.classId, classId))
    .orderBy(lessons.lessonNumber)
    .all();

  const lessonsWithTeachers = classLessons.map((lesson) => {
    const overrides = db
      .select({
        id: users.id,
        displayName: users.displayName,
        role: lessonTeacherOverrides.role,
      })
      .from(lessonTeacherOverrides)
      .innerJoin(users, eq(lessonTeacherOverrides.teacherId, users.id))
      .where(eq(lessonTeacherOverrides.lessonId, lesson.id))
      .all();

    return {
      ...lesson,
      teachers: overrides.length > 0 ? overrides : classTeacherList,
      hasOverride: overrides.length > 0,
    };
  });

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">{cls.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">{t(locale, 'edit')}</h2>
          <ClassForm
            teachers={teachers}
            initialData={{
              id: cls.id,
              name: cls.name,
              type: cls.type,
              room: cls.room,
              color: cls.color || '#4A90D9',
              notes: cls.notes || '',
              totalLessons: cls.totalLessons,
              studentCount: cls.studentCount,
              status: cls.status,
              teachers: classTeacherList.map((t) => ({ id: t.id, role: t.role })),
            }}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">
            {t(locale, 'lessons')} ({classLessons.length})
          </h2>
          <LessonList
            lessons={lessonsWithTeachers}
            totalLessons={cls.totalLessons}
            allTeachers={teachers}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}
