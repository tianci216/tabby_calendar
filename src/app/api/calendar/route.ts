import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes, classTeachers, lessons, lessonTeacherOverrides, events, users } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getApiUser, unauthorized, badRequest } from '@/lib/api-auth';
import { getColorKeywords, resolveKeywordColor } from '@/lib/color-keywords';

export async function GET(request: NextRequest) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return badRequest('start and end query params required (YYYY-MM-DD)');
  }

  // Fetch lessons in date range with class info
  const rawLessons = db
    .select({
      id: lessons.id,
      classId: lessons.classId,
      className: classes.name,
      classType: classes.type,
      classStatus: classes.status,
      classColor: classes.color,
      studentCount: classes.studentCount,
      lessonNumber: lessons.lessonNumber,
      totalLessons: classes.totalLessons,
      date: lessons.date,
      startTime: lessons.startTime,
      endTime: lessons.endTime,
      room: lessons.room,
      isCancelled: lessons.isCancelled,
      notes: lessons.notes,
    })
    .from(lessons)
    .innerJoin(classes, eq(lessons.classId, classes.id))
    .where(and(gte(lessons.date, start), lte(lessons.date, end)))
    .orderBy(lessons.date, lessons.startTime)
    .all();

  // Fetch keyword-color mappings for color resolution
  const keywords = getColorKeywords();

  // For each lesson, get teachers (overrides or class-level)
  const lessonsWithTeachers = rawLessons.map((lesson) => {
    // Check for overrides first
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

    const resolvedColor = resolveKeywordColor(lesson.className, keywords) || lesson.classColor || '#4A90D9';

    if (overrides.length > 0) {
      return { ...lesson, classColor: resolvedColor, teachers: overrides };
    }

    // Fall back to class teachers
    const teachers = db
      .select({
        id: users.id,
        displayName: users.displayName,
        role: classTeachers.role,
      })
      .from(classTeachers)
      .innerJoin(users, eq(classTeachers.teacherId, users.id))
      .where(eq(classTeachers.classId, lesson.classId))
      .all();

    return { ...lesson, classColor: resolvedColor, teachers };
  });

  // Fetch non-recurring events in date range
  const dateEvents = db
    .select({
      id: events.id,
      type: events.type,
      title: events.title,
      date: events.date,
      endDate: events.endDate,
      startTime: events.startTime,
      endTime: events.endTime,
      room: events.room,
      teacherId: events.teacherId,
      teacherName: users.displayName,
      notes: events.notes,
      isRecurring: events.isRecurring,
      recurrencePeriod: events.recurrencePeriod,
    })
    .from(events)
    .leftJoin(users, eq(events.teacherId, users.id))
    .where(and(gte(events.date, start), lte(events.date, end), eq(events.isRecurring, false)))
    .orderBy(events.date, events.startTime)
    .all();

  // Fetch recurring events that started on or before the end of the range
  const recurringEvents = db
    .select({
      id: events.id,
      type: events.type,
      title: events.title,
      date: events.date,
      endDate: events.endDate,
      startTime: events.startTime,
      endTime: events.endTime,
      room: events.room,
      teacherId: events.teacherId,
      teacherName: users.displayName,
      notes: events.notes,
      isRecurring: events.isRecurring,
      recurrencePeriod: events.recurrencePeriod,
    })
    .from(events)
    .leftJoin(users, eq(events.teacherId, users.id))
    .where(and(lte(events.date, end), eq(events.isRecurring, true)))
    .all();

  // Expand recurring events into the date range
  const expandedEvents: typeof dateEvents = [...dateEvents];
  for (const event of recurringEvents) {
    const eventDate = new Date(event.date + 'T00:00:00');
    const rangeStart = new Date(start + 'T00:00:00');
    const rangeEnd = new Date(end + 'T00:00:00');

    let current = new Date(eventDate);
    while (current <= rangeEnd) {
      if (current >= rangeStart) {
        const dateStr = current.toISOString().split('T')[0];
        expandedEvents.push({ ...event, date: dateStr });
      }
      // Advance by period
      if (event.recurrencePeriod === 'daily') {
        current.setDate(current.getDate() + 1);
      } else if (event.recurrencePeriod === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else if (event.recurrencePeriod === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else {
        break;
      }
    }
  }

  // Sort all events by date and time
  expandedEvents.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''));

  return NextResponse.json({
    lessons: lessonsWithTeachers,
    events: expandedEvents,
  });
}
