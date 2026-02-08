import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getApiUser, unauthorized, notFound } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const event = db.select().from(events).where(eq(events.id, parseInt(id))).get();
  if (!event) return notFound('Event not found');

  return NextResponse.json(event);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const eventId = parseInt(id);
  const oldEvent = db.select().from(events).where(eq(events.id, eventId)).get();
  if (!oldEvent) return notFound('Event not found');

  const body = await request.json();
  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = { updatedAt: now };
  if (body.type !== undefined) updateData.type = body.type;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.date !== undefined) updateData.date = body.date;
  if (body.endDate !== undefined) updateData.endDate = body.endDate;
  if (body.startTime !== undefined) updateData.startTime = body.startTime;
  if (body.endTime !== undefined) updateData.endTime = body.endTime;
  if (body.room !== undefined) updateData.room = body.room;
  if (body.teacherId !== undefined) updateData.teacherId = body.teacherId;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const updated = db.update(events)
    .set(updateData)
    .where(eq(events.id, eventId))
    .returning()
    .get();

  logAudit({
    userId: user.id,
    action: 'update_event',
    entityType: 'event',
    entityId: eventId,
    oldValues: oldEvent as Record<string, unknown>,
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
  const eventId = parseInt(id);
  const event = db.select().from(events).where(eq(events.id, eventId)).get();
  if (!event) return notFound('Event not found');

  db.delete(events).where(eq(events.id, eventId)).run();

  logAudit({
    userId: user.id,
    action: 'delete_event',
    entityType: 'event',
    entityId: eventId,
    oldValues: event as Record<string, unknown>,
  });

  return NextResponse.json({ success: true });
}
