import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;

  if (sessionId) {
    db.delete(sessions).where(eq(sessions.id, sessionId)).run();
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('session', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });

  return response;
}
