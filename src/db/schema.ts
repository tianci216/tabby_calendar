import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// ─── USERS ───
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role', { enum: ['owner', 'teacher'] }).notNull().default('teacher'),
  icalToken: text('ical_token').notNull().unique(),
  createdAt: text('created_at').notNull(),
});

// ─── SESSIONS ───
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  expiresAt: text('expires_at').notNull(),
});

// ─── CLASSES ───
export const classes = sqliteTable('classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['solo', 'social'] }).notNull(),
  status: text('status', { enum: ['planned', 'confirmed', 'cancelled'] }).notNull().default('planned'),
  totalLessons: integer('total_lessons').notNull().default(6),
  studentCount: integer('student_count').notNull().default(0),
  room: text('room', { enum: ['rendez_vous', 'palomar'] }).notNull(),
  color: text('color').default('#4A90D9'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ─── CLASS TEACHERS ───
export const classTeachers = sqliteTable('class_teachers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  teacherId: integer('teacher_id').notNull().references(() => users.id),
  role: text('role', { enum: ['solo', 'leader', 'follower'] }).notNull(),
}, (table) => [
  index('ct_class_idx').on(table.classId),
]);

// ─── LESSONS ───
export const lessons = sqliteTable('lessons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  lessonNumber: integer('lesson_number').notNull(),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  room: text('room', { enum: ['rendez_vous', 'palomar'] }).notNull(),
  isCancelled: integer('is_cancelled', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('lesson_date_idx').on(table.date),
  index('lesson_class_idx').on(table.classId),
]);

// ─── LESSON TEACHER OVERRIDES ───
export const lessonTeacherOverrides = sqliteTable('lesson_teacher_overrides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  lessonId: integer('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  teacherId: integer('teacher_id').notNull().references(() => users.id),
  role: text('role', { enum: ['solo', 'leader', 'follower'] }).notNull(),
}, (table) => [
  index('lto_lesson_idx').on(table.lessonId),
]);

// ─── EVENTS ───
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['party', 'gig', 'absence', 'note'] }).notNull(),
  title: text('title').notNull(),
  date: text('date').notNull(),
  endDate: text('end_date'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  room: text('room', { enum: ['rendez_vous', 'palomar'] }),
  teacherId: integer('teacher_id').references(() => users.id),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
  recurrencePeriod: text('recurrence_period', { enum: ['daily', 'weekly', 'monthly'] }),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('event_date_idx').on(table.date),
]);

// ─── COLOR KEYWORDS ───
export const colorKeywords = sqliteTable('color_keywords', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  keyword: text('keyword').notNull().unique(),
  color: text('color').notNull(),
  priority: integer('priority').notNull().default(0),
});

// ─── AUDIT LOG ───
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  changes: text('changes').notNull(),
  timestamp: text('timestamp').notNull(),
}, (table) => [
  index('audit_timestamp_idx').on(table.timestamp),
  index('audit_entity_idx').on(table.entityType, table.entityId),
]);
