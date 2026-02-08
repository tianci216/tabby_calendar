import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLog, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getApiUser, unauthorized, forbidden } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const user = getApiUser(request);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return forbidden();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  const entries = db
    .select({
      id: auditLog.id,
      userId: auditLog.userId,
      userName: users.displayName,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      changes: auditLog.changes,
      timestamp: auditLog.timestamp,
    })
    .from(auditLog)
    .innerJoin(users, eq(auditLog.userId, users.id))
    .orderBy(desc(auditLog.timestamp))
    .limit(limit)
    .offset(offset)
    .all();

  return NextResponse.json({ entries, page, limit });
}
