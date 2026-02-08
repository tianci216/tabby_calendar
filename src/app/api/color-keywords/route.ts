import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { colorKeywords } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { getApiUser, unauthorized, forbidden, badRequest } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const keywords = db.select().from(colorKeywords).orderBy(desc(colorKeywords.priority)).all();
  return NextResponse.json(keywords);
}

export async function POST(request: NextRequest) {
  const user = getApiUser(request);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return forbidden();

  const body = await request.json();
  const { keyword, color, priority } = body;

  if (!keyword || !color) return badRequest('Keyword and color are required');

  const created = db.insert(colorKeywords).values({
    keyword: keyword.trim(),
    color,
    priority: priority || 0,
  }).returning().get();

  logAudit({
    userId: user.id,
    action: 'create_color_keyword',
    entityType: 'color_keyword',
    entityId: created.id,
    newValues: { keyword: created.keyword, color: created.color, priority: created.priority },
  });

  return NextResponse.json(created, { status: 201 });
}
