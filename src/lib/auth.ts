import crypto from 'crypto';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const computed = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
}

export function createSession(userId: number): string {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  }).run();

  return sessionId;
}

export function validateSession(sessionId: string): { userId: number } | null {
  const session = db.select().from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (!session || new Date(session.expiresAt) < new Date()) {
    if (session) {
      db.delete(sessions).where(eq(sessions.id, sessionId)).run();
    }
    return null;
  }

  return { userId: session.userId };
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;
  if (!sessionId) return null;

  const result = validateSession(sessionId);
  if (!result) return null;

  const user = db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    role: users.role,
    icalToken: users.icalToken,
  }).from(users).where(eq(users.id, result.userId)).get();

  return user || null;
}
