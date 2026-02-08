import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getApiUser, unauthorized, forbidden, notFound } from '@/lib/api-auth';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getApiUser(request);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return forbidden();

  const { id } = await params;
  const userId = parseInt(id);
  const oldUser = db.select().from(users).where(eq(users.id, userId)).get();
  if (!oldUser) return notFound('User not found');

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.displayName !== undefined) updateData.displayName = body.displayName;
  if (body.role !== undefined) updateData.role = body.role;
  if (body.password) updateData.passwordHash = hashPassword(body.password);

  const updated = db.update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning()
    .get();

  logAudit({
    userId: user.id,
    action: 'update_user',
    entityType: 'user',
    entityId: userId,
    oldValues: { displayName: oldUser.displayName, role: oldUser.role },
    newValues: { displayName: updated.displayName, role: updated.role },
  });

  return NextResponse.json({
    id: updated.id,
    username: updated.username,
    displayName: updated.displayName,
    role: updated.role,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getApiUser(request);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return forbidden();

  const { id } = await params;
  const userId = parseInt(id);
  const target = db.select().from(users).where(eq(users.id, userId)).get();
  if (!target) return notFound('User not found');

  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot delete owner account' }, { status: 400 });
  }

  db.delete(users).where(eq(users.id, userId)).run();

  logAudit({
    userId: user.id,
    action: 'delete_user',
    entityType: 'user',
    entityId: userId,
    oldValues: { username: target.username, displayName: target.displayName },
  });

  return NextResponse.json({ success: true });
}
