import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lessons, lessonTeacherOverrides, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getApiUser, unauthorized, notFound } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const lessonId = parseInt(id);
  const oldLesson = db.select().from(lessons).where(eq(lessons.id, lessonId)).get();
  if (!oldLesson) return notFound('Lesson not found');

  const body = await request.json();
  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = { updatedAt: now };
  if (body.date !== undefined) updateData.date = body.date;
  if (body.startTime !== undefined) updateData.startTime = body.startTime;
  if (body.endTime !== undefined) updateData.endTime = body.endTime;
  if (body.room !== undefined) updateData.room = body.room;
  if (body.isCancelled !== undefined) updateData.isCancelled = body.isCancelled;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const updated = db.update(lessons)
    .set(updateData)
    .where(eq(lessons.id, lessonId))
    .returning()
    .get();

  // Handle teacher substitution
  if (body.teacherOverrides) {
    // Clear existing overrides
    db.delete(lessonTeacherOverrides)
      .where(eq(lessonTeacherOverrides.lessonId, lessonId))
      .run();

    // Insert new overrides
    for (const override of body.teacherOverrides) {
      db.insert(lessonTeacherOverrides).values({
        lessonId,
        teacherId: override.teacherId,
        role: override.role,
      }).run();
    }
  }

  // If teacherOverrides is explicitly empty array, clear overrides (revert to class teachers)
  if (body.teacherOverrides && body.teacherOverrides.length === 0) {
    db.delete(lessonTeacherOverrides)
      .where(eq(lessonTeacherOverrides.lessonId, lessonId))
      .run();
  }

  logAudit({
    userId: user.id,
    action: 'update_lesson',
    entityType: 'lesson',
    entityId: lessonId,
    oldValues: oldLesson as Record<string, unknown>,
    newValues: { ...updated, teacherOverrides: body.teacherOverrides } as Record<string, unknown>,
  });

  return NextResponse.json(updated);
}
