import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getApiUser, unauthorized, forbidden, badRequest } from '@/lib/api-auth';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const user = getApiUser(request);
  if (!user) return unauthorized();

  const allUsers = db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    role: users.role,
    icalToken: users.icalToken,
    createdAt: users.createdAt,
  }).from(users).all();

  return NextResponse.json(allUsers);
}

export async function POST(request: NextRequest) {
  const user = getApiUser(request);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return forbidden();

  const body = await request.json();
  const { username, password, displayName, role } = body;

  if (!username || !password || !displayName) {
    return badRequest('Username, password, and display name are required');
  }

  const newUser = db.insert(users).values({
    username,
    passwordHash: hashPassword(password),
    displayName,
    role: role || 'teacher',
    icalToken: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date().toISOString(),
  }).returning().get();

  logAudit({
    userId: user.id,
    action: 'create_user',
    entityType: 'user',
    entityId: newUser.id,
    newValues: { username, displayName, role: role || 'teacher' },
  });

  return NextResponse.json({
    id: newUser.id,
    username: newUser.username,
    displayName: newUser.displayName,
    role: newUser.role,
    icalToken: newUser.icalToken,
  }, { status: 201 });
}
