# Tabby Calendar

A custom calendar web app for dance studio class scheduling. Replaces manual spreadsheets with a responsive interface for managing classes, lessons, events, and teacher assignments.

## Features

- **Weekly & Monthly Calendar Views** - CSS grid layout with two rooms (Rendez vous / Palomar) displayed side-by-side
- **Class Management** - Create classes (solo/social), auto-generate lesson schedules, track student count and status (planned/confirmed)
- **Teacher Substitution** - Override teachers per-lesson without affecting the class default
- **Event Tracking** - Dance parties, gigs, teacher absences, and notes
- **iCal Feed** - Each teacher gets a unique URL for Google Calendar / Apple Calendar sync
- **Bilingual UI** - English and Simplified Chinese with one-click toggle
- **Audit Log** - All edits are logged with JSON diffs for owner review
- **Mobile Responsive** - Single-day view with day tabs on small screens
- **Role-based Access** - Owner and teacher roles with session-based auth

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **SQLite** via better-sqlite3 + **Drizzle ORM**
- **Tailwind CSS v4**
- **ical-generator** for .ics feeds
- **Docker** for deployment

## Quick Start (Docker)

```bash
# Clone the repo
git clone https://github.com/tianci216/tabby_calendar.git
cd tabby_calendar

# Generate a session secret
mkdir -p data
echo "SESSION_SECRET=$(openssl rand -hex 32)" > .env

# Build and run
sudo docker compose up -d --build

# Access at http://localhost:3210
# Default login: admin / changeme
```

## Development

```bash
npm install
npm run dev        # Start dev server on http://localhost:3000
npm run db:seed    # Create initial admin account
```

## Project Structure

```
src/
  app/              # Next.js App Router pages and API routes
    (authenticated)/  # Protected routes (calendar, classes, events, admin)
    api/              # REST API (auth, calendar, classes, lessons, events, users, audit, ical)
    login/            # Public login page
  components/       # React components
    calendar/         # WeeklyGrid, MonthlyGrid, TeacherSummary
    forms/            # ClassForm, EventForm, LessonList
    layout/           # Navbar, LocaleToggle
    admin/            # UserManagement, AuditLog
  db/               # Database schema, connection, seed
  lib/              # Auth, audit, i18n, calendar utils, class generator
public/locales/     # EN/ZH translation files
drizzle/            # SQL migrations
```

## Database

8 tables: `users`, `sessions`, `classes`, `class_teachers`, `lessons`, `lesson_teacher_overrides`, `events`, `audit_log`.

Teacher substitution uses an override pattern - lessons inherit teachers from `class_teachers` unless a `lesson_teacher_overrides` entry exists for that lesson.

## Deployment

Runs in Docker on port 3210. SQLite database is persisted via a volume mount at `./data/tabby.db`.

```bash
sudo docker compose up -d --build    # Build and start
sudo docker compose logs -f          # View logs
sudo docker compose restart          # Restart (data persists)
```
