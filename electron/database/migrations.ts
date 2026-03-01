import Database from 'better-sqlite3';

const MIGRATIONS: { version: number; description: string; sql: string }[] = [
  {
    version: 1,
    description: 'Initial schema: jobs, projects, categories, time entries, breaks, tags, goals, settings',
    sql: `
      -- Jobs / Work
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#0078d4',
        hourly_rate REAL,
        currency TEXT DEFAULT 'EUR',
        is_archived INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Projects within Jobs
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#0078d4',
        description TEXT,
        hourly_rate_override REAL,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      -- Work Categories
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT NOT NULL DEFAULT '#0078d4',
        is_archived INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Tags
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#6b7280',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Time Entries
      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        project_id TEXT,
        category_id TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_minutes REAL,
        note TEXT,
        is_manual INTEGER NOT NULL DEFAULT 0,
        is_running INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      );

      -- Time Entry Tags (many-to-many)
      CREATE TABLE IF NOT EXISTS time_entry_tags (
        time_entry_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (time_entry_id, tag_id),
        FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      -- Breaks within Time Entries
      CREATE TABLE IF NOT EXISTS breaks (
        id TEXT PRIMARY KEY,
        time_entry_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        break_type TEXT NOT NULL CHECK (break_type IN ('coffee', 'lunch')),
        duration_minutes REAL,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE
      );

      -- Goals
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        goal_type TEXT NOT NULL CHECK (goal_type IN ('daily', 'weekly', 'monthly')),
        target_hours REAL NOT NULL,
        job_id TEXT,
        project_id TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Achievements / Badges
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        unlocked_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- User XP & Level
      CREATE TABLE IF NOT EXISTS gamification (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_log_date TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Settings
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Audit Log
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
        old_values TEXT,
        new_values TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_time_entries_job ON time_entries(job_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_category ON time_entries(category_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_start ON time_entries(start_time);
      CREATE INDEX IF NOT EXISTS idx_time_entries_running ON time_entries(is_running);
      CREATE INDEX IF NOT EXISTS idx_breaks_entry ON breaks(time_entry_id);
      CREATE INDEX IF NOT EXISTS idx_projects_job ON projects(job_id);
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

      -- Default settings
      INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'de');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'system');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('coffee_break_max_minutes', '15');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('idle_threshold_minutes', '5');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_target_hours', '8');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('weekly_target_hours', '40');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('gamification_enabled', 'true');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('notifications_enabled', 'true');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('pomodoro_work_minutes', '25');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('pomodoro_break_minutes', '5');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('compact_mode', 'false');

      -- Initialize gamification
      INSERT OR IGNORE INTO gamification (id, xp, level) VALUES (1, 0, 1);

      -- Seed default achievements
      INSERT OR IGNORE INTO achievements (id, key, name, description, icon) VALUES
        ('ach-1', 'first_entry', 'Erster Eintrag', 'Logge deinen ersten Zeiteintrag', '🎯'),
        ('ach-2', 'hours_100', '100 Stunden', 'Erreiche 100 geloggte Stunden', '💯'),
        ('ach-3', 'hours_500', '500 Stunden', 'Erreiche 500 geloggte Stunden', '🏆'),
        ('ach-4', 'hours_1000', 'Tausender Club', 'Erreiche 1000 geloggte Stunden', '👑'),
        ('ach-5', 'streak_7', 'Wochenkrieger', '7 Tage in Folge geloggt', '🔥'),
        ('ach-6', 'streak_30', 'Monatsmarathon', '30 Tage in Folge geloggt', '⚡'),
        ('ach-7', 'all_categories', 'Allrounder', 'Nutze alle Kategorien mindestens einmal', '🌈'),
        ('ach-8', 'no_overtime_week', 'Work-Life Balance', 'Eine volle Woche ohne Überstunden', '⚖️'),
        ('ach-9', 'deep_focus', 'Deep Focus', 'Eine ununterbrochene Session von 90+ Minuten', '🧠'),
        ('ach-10', 'early_bird', 'Frühaufsteher', 'Beginne die Arbeit vor 7:00 Uhr', '🌅');
    `,
  },
  {
    version: 2,
    description: 'Add user accounts and link time entries to users',
    sql: `
      -- Users / Profiles
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_name TEXT,
        password_hash TEXT NOT NULL,
        avatar_color TEXT NOT NULL DEFAULT '#0078d4',
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Link time entries to users
      ALTER TABLE time_entries ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);

      -- Default user
      INSERT OR IGNORE INTO users (id, name, display_name, password_hash, avatar_color)
      VALUES ('default-user', 'Standard', 'Standard Benutzer', '', '#0078d4');

      -- Assign existing entries to default user
      UPDATE time_entries SET user_id = 'default-user' WHERE user_id IS NULL;

      -- Track active user in settings
      INSERT OR IGNORE INTO settings (key, value) VALUES ('active_user_id', 'default-user');
    `,
  },
];

export function runMigrations(db: Database.Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedVersions = db
    .prepare('SELECT version FROM migrations ORDER BY version')
    .all()
    .map((row: any) => row.version);

  const transaction = db.transaction(() => {
    for (const migration of MIGRATIONS) {
      if (!appliedVersions.includes(migration.version)) {
        console.log(`Applying migration v${migration.version}: ${migration.description}`);
        db.exec(migration.sql);
        db.prepare('INSERT INTO migrations (version, description) VALUES (?, ?)').run(
          migration.version,
          migration.description
        );
      }
    }
  });

  transaction();
}
