const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'tabby.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run migrations
const migrationsDir = path.join(__dirname, 'drizzle');
const metaDir = path.join(migrationsDir, 'meta');
const journalPath = path.join(metaDir, '_journal.json');

if (fs.existsSync(journalPath)) {
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));

  // Create drizzle migration tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER
    )
  `);

  const applied = db.prepare('SELECT hash FROM __drizzle_migrations').all().map(r => r.hash);

  for (const entry of journal.entries) {
    const tag = entry.tag;
    if (applied.includes(tag)) {
      console.log(`Migration ${tag} already applied, skipping.`);
      continue;
    }

    const sqlFile = path.join(migrationsDir, `${tag}.sql`);
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

    db.transaction(() => {
      for (const stmt of statements) {
        // Handle tables/indexes that already exist (e.g. from drizzle-kit push)
        const safe = stmt.replace(/CREATE TABLE\b/gi, 'CREATE TABLE IF NOT EXISTS')
                        .replace(/CREATE INDEX\b/gi, 'CREATE INDEX IF NOT EXISTS')
                        .replace(/CREATE UNIQUE INDEX\b/gi, 'CREATE UNIQUE INDEX IF NOT EXISTS');
        db.exec(safe);
      }
      db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(tag, Date.now());
    })();

    console.log(`Applied migration: ${tag}`);
  }
} else {
  console.log('No migrations found, skipping.');
}

// Seed: create owner account if none exists
const owner = db.prepare("SELECT id FROM users WHERE role = 'owner'").get();
if (!owner) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync('changeme', salt, 64).toString('hex');
  const passwordHash = `${salt}:${hash}`;
  const icalToken = crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO users (username, password_hash, display_name, role, ical_token, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('admin', passwordHash, 'Admin', 'owner', icalToken, now);

  console.log('Owner account created: admin / changeme');
} else {
  console.log('Owner account exists, skipping seed.');
}

db.close();
console.log('Database initialized successfully.');
