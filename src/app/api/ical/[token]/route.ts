import { NextRequest } from 'next/server';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { db } from '@/db';
import { users, lessons, classes, classTeachers, lessonTeacherOverrides, events } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const user = db.select().from(users)
    .where(eq(users.icalToken, token))
    .get();

  if (!user) {
    return new Response('Not found', { status: 404 });
  }

  const calendar = ical({
    name: `Tabby Calendar - ${user.displayName}`,
    prodId: { company: 'tabby-calendar', product: 'ical-feed' },
  });
  calendar.method(ICalCalendarMethod.PUBLISH);
  calendar.ttl(60 * 30);

  // Get date cutoff: 30 days ago
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  // Find all lessons where this user is assigned as a teacher
  // 1. Lessons via classTeachers (default assignment)
  const classIds = db.select({ classId: classTeachers.classId })
    .from(classTeachers)
    .where(eq(classTeachers.teacherId, user.id))
    .all()
    .map((r) => r.classId);

  if (classIds.length > 0) {
    for (const classId of classIds) {
      const cls = db.select().from(classes).where(eq(classes.id, classId)).get();
      if (!cls) continue;

      const classLessons = db.select().from(lessons)
        .where(and(eq(lessons.classId, classId), gte(lessons.date, cutoffStr)))
        .all();

      for (const lesson of classLessons) {
        // Check if there's an override that replaces this teacher
        const overrides = db.select().from(lessonTeacherOverrides)
          .where(eq(lessonTeacherOverrides.lessonId, lesson.id))
          .all();

        if (overrides.length > 0) {
          // If overrides exist, check if this teacher is in the overrides
          const isStillAssigned = overrides.some((o) => o.teacherId === user.id);
          if (!isStillAssigned) continue;
        }

        if (lesson.isCancelled) continue;

        const [startH, startM] = lesson.startTime.split(':').map(Number);
        const [endH, endM] = lesson.endTime.split(':').map(Number);
        const [y, m, d] = lesson.date.split('-').map(Number);

        const evt = calendar.createEvent({
          start: new Date(y, m - 1, d, startH, startM),
          end: new Date(y, m - 1, d, endH, endM),
          summary: `${cls.name} (${lesson.lessonNumber}/${cls.totalLessons})`,
          location: lesson.room === 'rendez_vous' ? 'Rendez vous' : 'Palomar',
        });
        evt.id(`lesson-${lesson.id}@tabby-calendar`);
        evt.description([
          lesson.notes,
          cls.status === 'planned' ? 'Status: Planned' : 'Status: Confirmed',
        ].filter(Boolean).join('\n'));
      }
    }
  }

  // 2. Lessons via overrides (substitution assignments)
  const overrideAssignments = db.select({ lessonId: lessonTeacherOverrides.lessonId })
    .from(lessonTeacherOverrides)
    .where(eq(lessonTeacherOverrides.teacherId, user.id))
    .all();

  for (const { lessonId } of overrideAssignments) {
    const lesson = db.select().from(lessons)
      .where(and(eq(lessons.id, lessonId), gte(lessons.date, cutoffStr)))
      .get();

    if (!lesson || lesson.isCancelled) continue;

    // Skip if already added via classTeachers
    if (classIds.includes(lesson.classId)) continue;

    const cls = db.select().from(classes).where(eq(classes.id, lesson.classId)).get();
    if (!cls) continue;

    const [startH, startM] = lesson.startTime.split(':').map(Number);
    const [endH, endM] = lesson.endTime.split(':').map(Number);
    const [y, m, d] = lesson.date.split('-').map(Number);

    const subEvt = calendar.createEvent({
      start: new Date(y, m - 1, d, startH, startM),
      end: new Date(y, m - 1, d, endH, endM),
      summary: `[Sub] ${cls.name} (${lesson.lessonNumber}/${cls.totalLessons})`,
      location: lesson.room === 'rendez_vous' ? 'Rendez vous' : 'Palomar',
    });
    subEvt.id(`lesson-sub-${lesson.id}@tabby-calendar`);
    if (lesson.notes) subEvt.description(lesson.notes);
  }

  // 3. Events assigned to this teacher
  const teacherEvents = db.select().from(events)
    .where(and(eq(events.teacherId, user.id), gte(events.date, cutoffStr)))
    .all();

  for (const event of teacherEvents) {
    const [y, m, d] = event.date.split('-').map(Number);
    const start = event.startTime
      ? new Date(y, m - 1, d, ...event.startTime.split(':').map(Number) as [number, number])
      : new Date(y, m - 1, d);
    const end = event.endTime
      ? new Date(y, m - 1, d, ...event.endTime.split(':').map(Number) as [number, number])
      : new Date(y, m - 1, d, 23, 59);

    const calEvt = calendar.createEvent({
      start,
      end,
      allDay: !event.startTime,
      summary: event.title,
    });
    calEvt.id(`event-${event.id}@tabby-calendar`);
    if (event.notes) calEvt.description(event.notes);
  }

  return new Response(calendar.toString(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="calendar.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
