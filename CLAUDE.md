# CLAUDE.md - Tabby Calendar

## What This Is

Dance studio calendar web app. Manages classes, lessons, teacher assignments, and events across two rooms. Replaces manual spreadsheets. Deployed via Docker on a VPS at port 3210.

## Commands

```bash
# Development
npm run dev              # Start dev server (port 3000, turbopack)
npm run build            # Production build (standalone output)
npx tsx src/db/seed.ts   # Seed initial admin account (admin/changeme)

# Database
npx drizzle-kit generate # Generate SQL migrations from schema changes
npx drizzle-kit push     # Push schema directly to DB (dev only)

# Docker (production)
sudo docker compose up -d --build   # Build and deploy
sudo docker compose logs -f         # View logs
sudo docker compose restart         # Restart (data persists in ./data/)

# TypeScript check
npx tsc --noEmit

# Test API (with session cookie)
curl -b "session=TOKEN" http://localhost:3210/api/calendar?start=2026-01-01&end=2026-12-31
```

## Tech Stack

- **Next.js 16** (App Router, standalone output) + **React 19**
- **SQLite** via `better-sqlite3` + **Drizzle ORM** (schema in `src/db/schema.ts`)
- **Tailwind CSS v4** (uses `@tailwindcss/postcss` plugin, NOT `tailwindcss` PostCSS plugin)
- **ical-generator v10** for .ics feeds
- No external auth/i18n/UI libraries — all hand-rolled

## Architecture

### Route Groups

All authenticated pages live under `src/app/(authenticated)/`. The `(authenticated)/layout.tsx` checks auth server-side via `getAuthenticatedUser()` and renders the `<Navbar>`. The `(authenticated)` route group prefix does NOT appear in URLs.

### Two Auth Patterns

1. **Server components / layouts**: Use `getAuthenticatedUser()` from `src/lib/auth.ts` — reads cookie via `next/headers` `cookies()` (async).
2. **API routes**: Use `getApiUser(request)` from `src/lib/api-auth.ts` — reads cookie from `NextRequest.cookies`.

These are separate because Next.js middleware/route handlers use `NextRequest` while server components use `next/headers`.

### Middleware (`src/middleware.ts`)

Only checks cookie existence (does NOT validate against DB). Redirects to `/login` if no `session` cookie. Public paths: `/login`, `/api/auth/login`, `/api/ical/*`, `/_next/*`, `/locales/*`, `/favicon.ico`. The matcher also excludes `api/ical` to prevent 308 redirects.

### Database

SQLite file at `DATABASE_PATH` env var (default: `./data/tabby.db`). WAL mode + foreign keys enabled. Connection in `src/db/index.ts` is a module singleton.

**8 tables**: `users`, `sessions`, `classes`, `class_teachers`, `lessons`, `lesson_teacher_overrides`, `events`, `audit_log`.

Key design — **teacher substitution override pattern**: Lessons inherit teachers from `class_teachers` by default. Only when a teacher is substituted for a specific lesson does `lesson_teacher_overrides` get populated. The calendar API checks overrides first, falls back to class teachers. This avoids duplicating teacher rows across all lessons.

**Auto-confirm**: When a class's `studentCount` is updated to >= 6 via PUT `/api/classes/[id]`, status auto-changes to `'confirmed'`.

### Lesson Generation (`src/lib/class-generator.ts`)

When creating a class, `generateLessons()` takes schedule patterns (day-of-week + time slot pairs) and a first date, then generates `totalLessons` (default 6) lesson rows by iterating through weeks. Lessons are assigned to the earliest available date in round-robin across patterns.

### i18n

Two JSON files: `public/locales/en.json` and `public/locales/zh.json`. Server components use `t(locale, key)` from `src/lib/i18n.ts`. Client components use `useT()` hook from `src/lib/useLocale.ts` which reads locale from React context. Locale stored in a cookie, toggled via `LocaleToggle` component.

### Calendar Views

- **Weekly** (`WeeklyGrid.tsx`): CSS Grid with 14 data columns (7 days x 2 rooms) + 1 time label column. On mobile (<768px), switches to single-day view with tab navigation. Uses `useIsMobile` hook.
- **Monthly** (`MonthlyGrid.tsx`): Standard 7-column month grid. Clicking a day navigates to `/calendar/weekly?date=YYYY-MM-DD`.

### iCal Feed (`/api/ical/[token]`)

Token-secured (no cookie auth). Each user has a unique `icalToken`. Feed includes all lessons assigned to that teacher (via class_teachers or overrides) plus their events. Uses ical-generator v10 API.

### Audit Logging

Every mutating API route calls `logAudit()` from `src/lib/audit.ts`. Stores JSON diffs (old vs new values) in `audit_log` table. Viewable at `/admin/audit` (owner only).

## File Map

```
src/
  app/
    layout.tsx                          # Root layout, LocaleProvider, reads locale cookie
    page.tsx                            # Redirects to /calendar
    globals.css                         # Just `@import "tailwindcss"`
    login/page.tsx                      # Login form (public)
    (authenticated)/
      layout.tsx                        # Auth check + Navbar
      calendar/
        page.tsx                        # Redirects to /calendar/weekly
        weekly/page.tsx                 # WeeklyGrid + TeacherSummary
        monthly/page.tsx                # MonthlyGrid
      classes/
        page.tsx                        # Class list (server component)
        new/page.tsx                    # ClassForm (create)
        [id]/page.tsx                   # Class detail + LessonList
      events/
        new/page.tsx                    # EventForm (create)
        [id]/page.tsx                   # EventForm (edit)
      admin/
        users/page.tsx                  # UserManagement (owner only)
        audit/page.tsx                  # AuditLog viewer (owner only)
    api/
      auth/login/route.ts              # POST: verify credentials, set session cookie
      auth/logout/route.ts             # POST: delete session, clear cookie
      calendar/route.ts                # GET: lessons+events for date range (main data source for grids)
      classes/route.ts                 # GET: list, POST: create class+teachers+lessons
      classes/[id]/route.ts            # GET/PUT/DELETE single class
      lessons/[id]/route.ts            # PUT: reschedule, cancel, substitute teachers
      events/route.ts                  # GET: list, POST: create event
      events/[id]/route.ts             # PUT/DELETE single event
      users/route.ts                   # GET: list, POST: create (owner only)
      users/[id]/route.ts              # PUT/DELETE user (owner only)
      audit/route.ts                   # GET: paginated audit log (owner only)
      ical/[token]/route.ts            # GET: .ics feed (no cookie auth, token only)
  components/
    calendar/WeeklyGrid.tsx             # Main weekly calendar grid (largest component)
    calendar/MonthlyGrid.tsx            # Monthly calendar view
    calendar/TeacherSummary.tsx         # Sidebar: upcoming lessons count
    forms/ClassForm.tsx                 # Create/edit class with schedule patterns
    forms/EventForm.tsx                 # Create/edit event
    LessonList.tsx                      # Lesson list on class detail page
    layout/Navbar.tsx                   # Top nav with mobile menu
    layout/LocaleProvider.tsx           # Client-side locale context wrapper
    layout/LocaleToggle.tsx             # EN/ZH toggle button
    admin/UserManagement.tsx            # User CRUD (owner only)
  db/
    schema.ts                           # All 8 tables (Drizzle ORM schema)
    index.ts                            # DB connection singleton
    seed.ts                             # Creates initial admin/changeme account
  lib/
    auth.ts                             # Password hashing (crypto.scrypt), sessions, getAuthenticatedUser()
    api-auth.ts                         # getApiUser(request), HTTP error helpers
    i18n.ts                             # t(locale, key, params?) translation function
    useLocale.ts                        # React context + useT() hook
    class-generator.ts                  # generateLessons() from schedule patterns
    audit.ts                            # logAudit() with JSON diff
    calendar-utils.ts                   # Date math: getWeekStart (Monday-based), formatDateStr, etc.
  middleware.ts                         # Cookie existence check, public path allowlist
drizzle/                                # Generated SQL migrations
init-db.js                              # Docker startup: runs migrations + seeds DB
```

## Gotchas and Known Issues

### ical-generator v10 API

Properties like `uid` and `description` are NOT passed as constructor options. Use method chaining:
```ts
const evt = calendar.createEvent({ start, end, summary, location });
evt.id('some-uid');
evt.description('some description');
```

### Drizzle ORM

- `drizzle-kit generate` was previously hanging — if it hangs, use `drizzle-kit push --force` for dev, but migration files are needed for Docker.
- The `room` field is a text enum: `'rendez_vous' | 'palomar'`. Pass the exact string, not display names.
- Drizzle's `returning().get()` returns a single row. Use `.returning().all()` for multiple.

### Next.js 16

- Uses `output: 'standalone'` in `next.config.ts` for Docker.
- Route params in API routes are `Promise`-based: `const { id } = await params;`
- `cookies()` from `next/headers` is async (must `await`).

### Tailwind CSS v4

Uses `@tailwindcss/postcss` plugin (NOT the old `tailwindcss` PostCSS plugin). Config is in `postcss.config.mjs`. The `globals.css` only has `@import "tailwindcss"`.

### Docker

- Native module `better-sqlite3` must be explicitly copied to the runner stage (not traced by Next.js standalone).
- `init-db.js` runs migrations + seeds on every container start (idempotent).
- SQLite DB persists in `./data/` volume mount on host.
- Container runs as non-root `nextjs` user (uid 1001).

### Rooms

Two rooms: `rendez_vous` (display: "Rendez vous") and `palomar` (display: "Palomar"). These are column values in the DB, not separate tables.

### Week Start

Weeks start on **Monday** (not Sunday). See `getWeekStart()` in `calendar-utils.ts`.

### Session Auth

Sessions expire after 30 days. The middleware only checks cookie existence. Actual DB validation happens in `getAuthenticatedUser()` (server components) and `getApiUser()` (API routes).

## API Quick Reference

All API routes require a `session` cookie except `/api/auth/login` and `/api/ical/[token]`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | `{username, password}` → sets session cookie |
| `/api/auth/logout` | POST | Clears session |
| `/api/calendar?start=&end=` | GET | Lessons + events for date range (main data source) |
| `/api/classes` | GET/POST | List / create class (POST auto-generates lessons) |
| `/api/classes/[id]` | GET/PUT/DELETE | Single class CRUD |
| `/api/lessons/[id]` | PUT | Edit lesson: reschedule, cancel, substitute teachers |
| `/api/events` | GET/POST | List / create event |
| `/api/events/[id]` | PUT/DELETE | Single event CRUD |
| `/api/users` | GET/POST | List / create user (owner only) |
| `/api/users/[id]` | PUT/DELETE | Edit / delete user (owner only) |
| `/api/audit` | GET | Paginated audit log (owner only) |
| `/api/ical/[token]` | GET | iCal feed for teacher (no auth, token-secured) |

## Database Schema Summary

```
users:            id, username, passwordHash, displayName, role(owner|teacher), icalToken, createdAt
sessions:         id(text), userId→users, expiresAt
classes:          id, name, type(solo|social), status(planned|confirmed|cancelled), totalLessons, studentCount, room, color, notes, timestamps
class_teachers:   id, classId→classes(cascade), teacherId→users, role(solo|leader|follower)
lessons:          id, classId→classes(cascade), lessonNumber, date, startTime, endTime, room, isCancelled, notes, timestamps
lesson_teacher_overrides: id, lessonId→lessons(cascade), teacherId→users, role(solo|leader|follower)
events:           id, type(party|gig|absence|note), title, date, endDate?, startTime?, endTime?, room?, teacherId→users?, notes, timestamps
audit_log:        id, userId→users, action, entityType, entityId, changes(JSON), timestamp
```
