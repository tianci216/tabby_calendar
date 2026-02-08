import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { colorKeywords } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getApiUser, unauthorized, forbidden, notFound } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getApiUser(request);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return forbidden();

  const { id } = await params;
  const kwId = parseInt(id);
  const existing = db.select().from(colorKeywords).where(eq(colorKeywords.id, kwId)).get();
  if (!existing) return notFound('Color keyword not found');

  const body = await request.json();
  const updateData: Record<string, unknown> = {};
  if (body.keyword !== undefined) updateData.keyword = body.keyword.trim();
  if (body.color !== undefined) updateData.color = body.color;
  if (body.priority !== undefined) updateData.priority = body.priority;

  const updated = db.update(colorKeywords)
    .set(updateData)
    .where(eq(colorKeywords.id, kwId))
    .returning().get();

  logAudit({
    userId: user.id,
    action: 'update_color_keyword',
    entityType: 'color_keyword',
    entityId: kwId,
    oldValues: existing as Record<string, unknown>,
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
  if (user.role !== 'owner') return forbidden();

  const { id } = await params;
  const kwId = parseInt(id);
  const existing = db.select().from(colorKeywords).where(eq(colorKeywords.id, kwId)).get();
  if (!existing) return notFound('Color keyword not found');

  db.delete(colorKeywords).where(eq(colorKeywords.id, kwId)).run();

  logAudit({
    userId: user.id,
    action: 'delete_color_keyword',
    entityType: 'color_keyword',
    entityId: kwId,
    oldValues: existing as Record<string, unknown>,
  });

  return NextResponse.json({ success: true });
}
