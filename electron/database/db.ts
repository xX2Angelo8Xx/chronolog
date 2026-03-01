import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { runMigrations } from './migrations';

let db: Database.Database;

export function initDatabase(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'chronolog.db');
  
  db = new Database(dbPath);
  
  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  // Run migrations
  runMigrations(db);
  
  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
