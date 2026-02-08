import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes, classTeachers, lessons, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getApiUser, unauthorized, badRequest } from '@/lib/api-auth';
import { generateLessons } from '@/lib/class-generator';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const allClasses = db.select().from(classes).all();

  const result = allClasses.map((cls) => {
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

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const body = await request.json();
  const { name, type, room, color, notes, totalLessons, teachers: teacherList, firstDate, patterns } = body;

  if (!name || !type || !room || !firstDate || !patterns?.length) {
    return badRequest('Missing required fields');
  }

  if (type === 'social' && (!teacherList || teacherList.length < 2)) {
    return badRequest('Social class requires leader and follower teachers');
  }

  const now = new Date().toISOString();

  // 1. Create the class
  const cls = db.insert(classes).values({
    name,
    type,
    status: 'planned' as const,
    totalLessons: totalLessons || 6,
    studentCount: 0,
    room,
    color: color || '#4A90D9',
    notes: notes || null,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  // 2. Add teachers
  if (teacherList && teacherList.length > 0) {
    for (const t of teacherList) {
      db.insert(classTeachers).values({
        classId: cls.id,
        teacherId: t.teacherId,
        role: t.role,
      }).run();
    }
  }

  // 3. Generate and insert lessons
  const lessonRows = generateLessons({
    classId: cls.id,
    room,
    totalLessons: totalLessons || 6,
    firstDate,
    patterns,
  });

  for (const lesson of lessonRows) {
    db.insert(lessons).values(lesson).run();
  }

  // 4. Audit log
  logAudit({
    userId: user.id,
    action: 'create_class',
    entityType: 'class',
    entityId: cls.id,
    newValues: { name, type, room, totalLessons, teacherList, firstDate, patterns },
  });

  return NextResponse.json(cls, { status: 201 });
}
