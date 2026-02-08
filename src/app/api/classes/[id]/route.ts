import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes, classTeachers, lessons, users, lessonTeacherOverrides } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getApiUser, unauthorized, notFound, badRequest } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const classId = parseInt(id);
  const cls = db.select().from(classes).where(eq(classes.id, classId)).get();
  if (!cls) return notFound('Class not found');

  const teachers = db
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

  // Get overrides for lessons
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
      teachers: overrides.length > 0 ? overrides : teachers,
      hasOverride: overrides.length > 0,
    };
  });

  return NextResponse.json({
    ...cls,
    teachers,
    lessons: lessonsWithTeachers,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const classId = parseInt(id);
  const oldClass = db.select().from(classes).where(eq(classes.id, classId)).get();
  if (!oldClass) return notFound('Class not found');

  const body = await request.json();
  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = { updatedAt: now };

  // Only update fields that are provided
  if (body.name !== undefined) updateData.name = body.name;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.studentCount !== undefined) {
    updateData.studentCount = body.studentCount;
    // Auto-confirm when reaching 6 students
    if (body.studentCount >= 6 && oldClass.status === 'planned') {
      updateData.status = 'confirmed';
    }
  }
  if (body.room !== undefined) updateData.room = body.room;
  if (body.color !== undefined) updateData.color = body.color;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const updated = db.update(classes)
    .set(updateData)
    .where(eq(classes.id, classId))
    .returning()
    .get();

  // Update teachers if provided
  if (body.teachers) {
    db.delete(classTeachers).where(eq(classTeachers.classId, classId)).run();
    for (const t of body.teachers) {
      db.insert(classTeachers).values({
        classId,
        teacherId: t.teacherId,
        role: t.role,
      }).run();
    }
  }

  logAudit({
    userId: user.id,
    action: 'update_class',
    entityType: 'class',
    entityId: classId,
    oldValues: oldClass as Record<string, unknown>,
    newValues: updated as unknown as Record<string, unknown>,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const classId = parseInt(id);
  const cls = db.select().from(classes).where(eq(classes.id, classId)).get();
  if (!cls) return notFound('Class not found');

  db.delete(classes).where(eq(classes.id, classId)).run();

  logAudit({
    userId: user.id,
    action: 'delete_class',
    entityType: 'class',
    entityId: classId,
    oldValues: cls as Record<string, unknown>,
  });

  return NextResponse.json({ success: true });
}
