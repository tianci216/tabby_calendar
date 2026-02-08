import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateSession } from './auth';

export function getApiUser(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) return null;

  const result = validateSession(sessionId);
  if (!result) return null;

  return db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    role: users.role,
  }).from(users).where(eq(users.id, result.userId)).get() || null;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
