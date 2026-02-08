import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events, users } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getApiUser, unauthorized, badRequest } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  let query = db.select({
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
    createdAt: events.createdAt,
  })
    .from(events)
    .leftJoin(users, eq(events.teacherId, users.id));

  const conditions = [];
  if (start) conditions.push(gte(events.date, start));
  if (end) conditions.push(lte(events.date, end));

  const result = conditions.length > 0
    ? query.where(and(...conditions)).all()
    : query.all();

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const body = await request.json();
  const { type, title, date, endDate, startTime, endTime, room, teacherId, notes } = body;

  if (!type || !title || !date) {
    return badRequest('Type, title, and date are required');
  }

  const now = new Date().toISOString();

  const event = db.insert(events).values({
    type,
    title,
    date,
    endDate: endDate || null,
    startTime: startTime || null,
    endTime: endTime || null,
    room: room || null,
    teacherId: teacherId || null,
    notes: notes || null,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  logAudit({
    userId: user.id,
    action: 'create_event',
    entityType: 'event',
    entityId: event.id,
    newValues: body,
  });

  return NextResponse.json(event, { status: 201 });
}
