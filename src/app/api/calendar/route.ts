import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes, classTeachers, lessons, lessonTeacherOverrides, events, users } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getApiUser, unauthorized, badRequest } from '@/lib/api-auth';

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

    if (overrides.length > 0) {
      return { ...lesson, teachers: overrides };
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

    return { ...lesson, teachers };
  });

  // Fetch events in date range
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
    })
    .from(events)
    .leftJoin(users, eq(events.teacherId, users.id))
    .where(and(gte(events.date, start), lte(events.date, end)))
    .orderBy(events.date, events.startTime)
    .all();

  return NextResponse.json({
    lessons: lessonsWithTeachers,
    events: dateEvents,
  });
}
