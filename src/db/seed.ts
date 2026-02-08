import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const existing = db.select().from(users).where(eq(users.role, 'owner')).get();
if (!existing) {
  db.insert(users).values({
    username: 'admin',
    passwordHash: hashPassword('changeme'),
    displayName: 'Admin',
    role: 'owner',
    icalToken: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date().toISOString(),
  }).run();
  console.log('Owner account created: admin / changeme');
} else {
  console.log('Owner account already exists, skipping seed.');
}
